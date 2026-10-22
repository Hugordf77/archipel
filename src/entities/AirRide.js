import * as THREE from 'three';
import { buildAlbatros } from '../models/animals/albatros.js';
import { groundAt, waterDepth, setGroundRef } from '../world/navigation.js';
import { worldLimit } from '../world/archipel.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smoothstep = THREE.MathUtils.smoothstep;

// Grande monture de voyage, construite une seule fois et animée par frame.
export class AirRide {
  constructor(game) {
    this.game = game;
    this.riding = false;
    this.velocity = new THREE.Vector3();
    this.wish = new THREE.Vector3();
    this.heading = 0;
    this.time = 0;
    this.savedCamera = null;
    this.bird = this.buildBird();
    this.bird.visible = false;
    game.scene.add(this.bird);

    // --- État physique de vol exposé (lu par Character.js et CameraRig) ---
    this.pitchAngle = 0;   // rad : positif = nez relevé (montée), négatif = piqué
    this.bankAngle  = 0;   // rad : positif = incliné droite
    this.bodyYaw    = 0;   // rad : lacet lent du corps, dérapé par rapport au heading
    this.speed      = 0;   // m/s : vitesse horizontale instantanée

    // --- Valeurs lissées pour le rendu (évite les à-coups) ---
    this._birdPitchSmooth = 0;
    this._birdBankSmooth  = 0;

    // --- Phase d'atterrissage et chute libre ---
    // 'flying' | 'freefall' | 'landing' | 'idle'
    this.flightPhase = 'idle';
    this._landingTimer = 0;
    this._birdFlyAwayTimer = 0;
  }

  buildBird() {
    return buildAlbatros();
  }

  summon() {
    const { player, rig, ui } = this.game;
    if (this.riding) {
      if (this.flightPhase === 'freefall') {
        this.catchBird();
        return;
      }
      return this.requestLanding();
    }
    if (player.locked || player.mode === 'action' || player.mode === 'seated' || player.climbing || this.game.sailing.aboard) {
      ui.toast(`L\u2019oiseau viendra quand tu seras libre.`, { icon: 'bird' });
      return;
    }
    this.riding = true;
    this.flightPhase = 'flying';
    this.time = 0;
    this.heading = player.facing;
    this.bodyYaw  = player.facing;
    this.pitchAngle = 0;
    this.bankAngle  = 0;
    this._birdPitchSmooth = 0;
    this._birdBankSmooth  = 0;
    this.velocity.set(0, 0, 0);
    player.mode = 'air';
    player.target = null;
    player.swimming = false;
    const floor = groundAt(player.pos.x, player.pos.z).y;
    player.pos.y = Math.max(player.pos.y, floor + 8);
    this.bird.visible = true;
    this.bird.scale.set(1, 1, 1);
    this.bird.position.set(player.pos.x, player.pos.y - 0.95, player.pos.z);
    this.savedCamera = {
      distance:   rig.distance,
      pitch:      rig.pitch,
      limits:     { ...rig.limits },
      followRate: rig.followRate,
      groundFn:   rig.groundFn,
    };
    rig.groundFn = null;
    rig.limits.maxDist = 72;
    rig.distance  = Math.max(rig.distance, 24);
    rig.pitch     = 0.42;
    rig.followRate = 3.4;
    this.game.character.setPose('glide');
    ui.toast(this.game.pad?.recent
      ? 'À dos du grand albatros ! Stick gauche pour voler · R2/L2 altitude · L3 accélérer · ↑ chute libre · ✕ atterrir'
      : 'À dos du grand albatros ! ZQSD pour voler · Espace/Ctrl altitude · Maj accélérer · F chute libre · E atterrir', { icon: 'bird', duration: 6200 });
  }

  // Sauter en chute libre depuis l'oiseau (ou bond catapulté depuis le sol)
  freeFall() {
    const { player, rig, ui } = this.game;
    if (!this.riding) {
      if (player.locked || player.mode === 'action' || player.mode === 'seated' || player.climbing || this.game.sailing.aboard) {
        ui.toast(`Impossible de sauter pour le moment.`, { icon: 'bird' });
        return;
      }
      // Grand saut catapulté depuis le sol : l'aigle propulse le joueur dans les nuages
      this.summon();
      const floor = groundAt(player.pos.x, player.pos.z).y;
      player.pos.y = floor + 46;
      this.velocity.set(Math.sin(player.facing) * 14, 8, Math.cos(player.facing) * 14);
      this.freeFall();
      return;
    }
    if (this.flightPhase === 'freefall') return;

    this.flightPhase = 'freefall';
    this.game.character.setPose('freefall');

    // Élan vers l'avant et saut vers le haut hors de la monture
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    this.velocity.x += forwardX * 7;
    this.velocity.z += forwardZ * 7;
    this.velocity.y = Math.max(3, this.velocity.y + 4.5);

    this._birdFlyAwayTimer = 0;
    this.game.pad?.hapticDive?.();
    const padMsg = this.game.pad?.isPlayStation
      ? "Chute libre ! Stick gauche pour planer · R2/L3 pour piquer · □ ou ↑ pour rappeler l'aigle"
      : "Chute libre ! Stick gauche pour planer · L3 pour piquer · ↑ pour rappeler l'aigle";
    ui.toast(this.game.pad?.recent
      ? padMsg
      : "Chute libre ! ZQSD pour planer · Maj pour piquer · G pour rappeler l'aigle", { icon: 'bird', duration: 5200 });
  }

  // Rappeler l'aigle pour qu'il rattrape le joueur en plein vol
  catchBird() {
    if (!this.riding || this.flightPhase !== 'freefall') return;
    const { player, ui } = this.game;
    this.flightPhase = 'flying';
    this.bird.visible = true;
    this.bird.scale.set(1, 1, 1);
    this.bird.position.set(player.pos.x, player.pos.y - 0.95, player.pos.z);
    this.bird.rotation.set(0, this.heading, 0);

    // Amortissement de la chute
    this.velocity.y = Math.max(3, this.velocity.y * 0.15 + 4);
    this.game.character.setPose('glide');
    this.game.character.bounce(0.8);
    this.game.pad?.hapticFlap?.();
    ui.toast(`L'aigle te rattrape en plein vol !`, { icon: 'bird', duration: 3200 });
  }

  requestLanding() {
    if (!this.riding) return;
    const { player, ui } = this.game;
    if (this.flightPhase === 'landing') return;
    if (this.flightPhase === 'freefall') {
      this.catchBird();
      return;
    }
    const floor = groundAt(player.pos.x, player.pos.z).y;
    if (floor < 0.35 || player.pos.y - floor > 4.5) {
      ui.toast(`Approche-toi d'une île et descends un peu pour atterrir.`, { icon: 'bird' });
      return;
    }
    // Lancer la phase d'atterrissage cinématique
    this.flightPhase = 'landing';
    this._landingTimer = 0;
  }

  finishRide(landingPose = 'idle') {
    const { player, rig, ui } = this.game;
    const floor = groundAt(player.pos.x, player.pos.z).y;
    player.pos.y = floor;
    player.mode = 'free';
    player.vel.set(0, 0, 0);
    player.actualSpeed = 0;
    player.targetSpeed = 0;
    player.sync();
    this.riding = false;
    this.flightPhase = 'idle';
    this.pitchAngle = 0;
    this.bankAngle  = 0;
    this.speed = 0;
    this.bird.visible = false;
    this.bird.scale.set(1, 1, 1);
    this.velocity.set(0, 0, 0);
    if (this.savedCamera) {
      rig.distance   = this.savedCamera.distance;
      rig.pitch      = this.savedCamera.pitch;
      rig.limits     = this.savedCamera.limits;
      rig.followRate = this.savedCamera.followRate;
      rig.groundFn   = this.savedCamera.groundFn;
      this.savedCamera = null;
    }
    rig.tilt = 0;
    if (this.game.camera) {
      this.game.camera.rotation.z = 0;
    }
    this.game.character.setPose(landingPose);
    this.game.character.bounce(landingPose === 'pickup' ? 1.4 : 0.45);
    if (landingPose === 'swim') {
      this.game.pad?.hapticSplash?.();
    } else {
      this.game.pad?.hapticLand?.(this.speed);
    }
    if (landingPose !== 'swim') {
      ui.toast(`Tu retrouves la terre ferme.`, { icon: 'leaf' });
    }
  }

  update(dt, input) {
    if (!this.riding) return;
    dt = Math.min(Math.max(dt, 0), 0.05);
    const { player, rig } = this.game;
    const p = player.pos;
    // en vol, le sol est celui que l'on survole à sa hauteur (dessus des îles célestes)
    setGroundRef(p.y);
    this.time += dt;

    // -----------------------------------------------------------------------
    // Phase de chute libre (skydive)
    // -----------------------------------------------------------------------
    if (this.flightPhase === 'freefall') {
      this._updateFreefall(dt, input);
      return;
    }

    // -----------------------------------------------------------------------
    // Phase d'atterrissage progressif
    // -----------------------------------------------------------------------
    if (this.flightPhase === 'landing') {
      this._landingTimer += dt;
      // Freinage aérodynamique : nez relevé et décélération forcée
      this.pitchAngle += (0.28 - this.pitchAngle) * damp(3.5, dt);
      const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      this.velocity.x *= 1 - damp(4.5, dt);
      this.velocity.z *= 1 - damp(4.5, dt);
      this.velocity.y += (-2.5 - this.velocity.y) * damp(3.0, dt);
      p.x += this.velocity.x * dt;
      p.z += this.velocity.z * dt;
      const floor = groundAt(p.x, p.z).y;
      p.y += this.velocity.y * dt;
      p.y = Math.max(p.y, floor);
      this.speed = Math.hypot(this.velocity.x, this.velocity.z);
      // Déclencher finishRide quand on est presque arrêté et presque au sol
      if (this.speed < 1.5 && p.y - floor < 0.6) {
        this.finishRide();
        return;
      }
      // Sécurité : atterrissage forcé après 3 s
      if (this._landingTimer > 3.0) {
        this.finishRide();
        return;
      }
      // Animation d'atterrissage : battements intensifiés
      this._updateBirdMesh(dt, this.speed, /* flapBoost */ 1.6, /* delta */ 0);
      player.facing = this.heading;
      player.vel.copy(this.velocity);
      player.actualSpeed = this.speed;
      player.targetSpeed = 0;
      player.sync();
      this.game.character.update(dt, Math.min(1, this.speed / 52), { airRide: this, vel: this.velocity, facing: this.heading });
      return;
    }

    // -----------------------------------------------------------------------
    // 1. Inputs : direction horizontale et intention de montée/descente
    // -----------------------------------------------------------------------
    input.moveVector(rig.forward, this.wish);
    const boost     = input.run;
    const maxSpeed  = boost ? 52 : 28;
    const hasInput  = this.wish.lengthSq() > 0.01;
    const climbCmd  = input.held('Space')
      ? 1
      : (input.held('ControlLeft') || input.held('ControlRight') ? -1 : 0);

    // -----------------------------------------------------------------------
    // 2. Angle d'attaque longitudinal (pitchAngle)
    // -----------------------------------------------------------------------
    const pitchTarget = climbCmd === 1 ? 0.35 : climbCmd === -1 ? -0.45 : 0;
    const pitchRate   = climbCmd !== 0 ? 2.2 : 1.2;
    this.pitchAngle  += (pitchTarget - this.pitchAngle) * damp(pitchRate, dt);

    // -----------------------------------------------------------------------
    // 3. Physique horizontale (poussée + traînée + plané)
    // -----------------------------------------------------------------------
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);

    // Accélération vers la direction souhaitée
    if (hasInput) {
      const accelRate = boost ? 4.2 : 2.8;
      this.velocity.x += (this.wish.x * maxSpeed - this.velocity.x) * damp(accelRate, dt);
      this.velocity.z += (this.wish.z * maxSpeed - this.velocity.z) * damp(accelRate, dt);
    } else {
      // Plané : très peu de traînée, l'oiseau conserve son élan
      this.velocity.x += (0 - this.velocity.x) * damp(0.55, dt);
      this.velocity.z += (0 - this.velocity.z) * damp(0.55, dt);
    }

    // Limite de l'archipel : au-delà de 1,2 km l'oiseau infléchit sa route vers le centre,
    // au-delà de 1,4 km il fait demi-tour de lui-même
    const lim = worldLimit(player.pos.x, player.pos.z);
    if (lim.pull > 0) {
      const k = damp(lim.turn ? 3 : lim.pull * 1.6, dt);
      const cruise = Math.max(18, hSpeed);
      this.velocity.x += (lim.ux * cruise - this.velocity.x) * k;
      this.velocity.z += (lim.uz * cruise - this.velocity.z) * k;
    }

    // Traînée aérodynamique augmentée par l'angle d'attaque
    const dragFactor = 1 - Math.abs(this.pitchAngle) * 0.04 * dt * 60;
    this.velocity.x *= dragFactor;
    this.velocity.z *= dragFactor;

    // -----------------------------------------------------------------------
    // 4. Physique verticale (portance, gravité, turbulences)
    // -----------------------------------------------------------------------
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);

    // Vitesse verticale cible pilotée par l'angle d'attaque et la vitesse
    const vyTarget = Math.sin(this.pitchAngle) * this.speed * 1.8;
    this.velocity.y += (vyTarget - this.velocity.y) * damp(2.4, dt);

    // Gravité douce aux faibles vitesses (décroche si trop lent)
    const liftFactor = smoothstep(this.speed, 5, 15);
    this.velocity.y -= 4.5 * dt * (1 - liftFactor);

    // Turbulences procédurales (légères oscillations de portance)
    const liftNoise = Math.sin(this.time * 1.1) * 0.30
                    + Math.sin(this.time * 2.7) * 0.12;
    this.velocity.y += liftNoise * (this.speed / 28) * dt;

    // Courant ascendant en altitude
    if (p.y > 60) this.velocity.y += 1.8 * dt;

    // -----------------------------------------------------------------------
    // 5. Rotation et virages banqués
    // -----------------------------------------------------------------------
    let headingDelta = 0;
    if (this.speed > 0.8) {
      const desired = Math.atan2(this.velocity.x, this.velocity.z);
      headingDelta   = (desired - this.heading + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      // Rayon de virage minimal croît avec la vitesse
      const turnResponse = Math.max(1.8, this.speed * 0.06);
      this.heading += headingDelta * damp(turnResponse, dt);
    }

    // Taux de virage → angle de bank
    const turnRate  = dt > 1e-4 ? headingDelta / dt : 0;
    const bankTarget = clamp(-turnRate * 0.38, -0.62, 0.62);
    this.bankAngle  += (bankTarget - this.bankAngle) * damp(5.0, dt);

    // Perte d'altitude dans les virages serrés
    this.velocity.y -= Math.abs(this.bankAngle) * this.speed * 0.12 * dt;

    // Le corps de l'oiseau "dérape" légèrement (yaw lent)
    const bodyYawDelta = ((this.heading - this.bodyYaw) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    this.bodyYaw      += bodyYawDelta * damp(2.0, dt);

    // -----------------------------------------------------------------------
    // 6. Intégration de la position
    // -----------------------------------------------------------------------
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    p.y += this.velocity.y * dt;
    const floor = groundAt(p.x, p.z).y;
    p.y = Math.max(p.y, floor + 3.2, 4.2);

    // -----------------------------------------------------------------------
    // 7. Synchronisation du joueur
    // -----------------------------------------------------------------------
    player.facing      = this.heading;
    player.vel.copy(this.velocity);
    player.actualSpeed = this.speed;
    player.targetSpeed = maxSpeed;
    player.sync();

    // -----------------------------------------------------------------------
    // 8. Mesh de l'oiseau (angles cinématiques)
    // -----------------------------------------------------------------------
    this._updateBirdMesh(dt, this.speed, 1.0, headingDelta);

    // -----------------------------------------------------------------------
    // 9. Caméra dynamique
    // -----------------------------------------------------------------------
    this._updateCamera(dt, rig);

    // -----------------------------------------------------------------------
    // 10. Personnage
    // -----------------------------------------------------------------------
    this.game.character.update(dt, Math.min(1, this.speed / 52), { airRide: this, vel: this.velocity, facing: this.heading });
  }

  // ---------------------------------------------------------------------------
  // Mise à jour du mesh de l'oiseau (angles cinématiques, battements, cou)
  // ---------------------------------------------------------------------------
  _updateBirdMesh(dt, speed, flapBoost, headingDelta) {
    const bird      = this.bird;
    const speedRatio = clamp(speed / 28, 0, 1);

    // Pitch lissé : nez baissé en piqué, relevé en cabré
    const pitchTarget = -this.pitchAngle * 0.7 + this.velocity.y * 0.018;
    this._birdPitchSmooth += (pitchTarget - this._birdPitchSmooth) * damp(6, dt);

    // Bank lissé : inclinaison de virage
    const bankTarget = this.bankAngle;
    this._birdBankSmooth  += (bankTarget - this._birdBankSmooth)  * damp(5, dt);

    bird.position.set(this.game.player.pos.x, this.game.player.pos.y - 0.95, this.game.player.pos.z);
    bird.rotation.set(
      this._birdPitchSmooth,
      this.bodyYaw,
      this._birdBankSmooth,
    );

    // Battement d'ailes : fréquence et amplitude liées à la vitesse
    const flapFreq = lerp(4.2, 7.5, speedRatio);
    const flapAmp  = lerp(0.55, 0.28, speedRatio) * flapBoost;
    // Montée = battre plus fort
    const climbBoost = clamp(this.pitchAngle * 2, 0, 1) * 0.3;
    const flap = Math.sin(this.time * flapFreq) * (flapAmp + climbBoost);

    // Ailes : battement global + repli progressif des plumes en plané rapide
    const wings = bird.userData.wings;
    for (let s = 0; s < wings.length; s++) {
      const sign = s === 0 ? 1 : -1;
      const wing = wings[s];
      // Battement du groupe aile
      wing.rotation.z = sign * flap;
      // Les plumes (enfants 1 à 5, après le mesh de base)
      const children = wing.children;
      for (let i = 1; i < children.length && i <= 5; i++) {
        const droop = lerp(0, -0.18, speedRatio) * ((i - 1) / 4);
        children[i].rotation.z = sign * flap * (1 - (i - 1) * 0.06) + sign * droop;
      }
    }

    // Cou : respiration au repos, pointé en piqué, relevé en cabré
    const neck = bird.userData.neck;
    const neckXRest = Math.sin(this.time * 1.3) * 0.04;
    const neckXFlight = -this.pitchAngle * 0.55;
    neck.rotation.x = lerp(neckXRest, neckXFlight, smoothstep(speed, 5, 22));
    neck.rotation.y = headingDelta * 0.18;
  }

  // ---------------------------------------------------------------------------
  // Caméra dynamique pendant le vol
  // ---------------------------------------------------------------------------
  _updateCamera(dt, rig) {
    const speed = this.speed;

    // Zoom arrière en boost, rapprochement au plané lent
    const targetDist = speed > 30
      ? clamp(30 + speed * 0.22, 30, 45)
      : lerp(22, 30, clamp(speed / 28, 0, 1));
    rig.distance += (targetDist - rig.distance) * damp(1.5, dt);

    // Pitch caméra : baisse quand on pique vite (on voit mieux la chute)
    const pitchTarget = (this.pitchAngle < -0.2 && speed > 25) ? 0.28 : 0.42;
    rig.pitch += (pitchTarget - rig.pitch) * damp(2.0, dt);

    // Dutch tilt léger dans les virages
    rig.tilt += (this.bankAngle * 0.12 - rig.tilt) * damp(4.0, dt);
    const cam = this.game.camera;
    if (cam) {
      const tiltTarget = this.bankAngle * 0.12;
      cam.rotation.z  += (tiltTarget - cam.rotation.z) * damp(4.0, dt);
    }
  }

  // ---------------------------------------------------------------------------
  // Physique et cinématique de la chute libre (skydive)
  // ---------------------------------------------------------------------------
  _updateFreefall(dt, input) {
    const { player, rig } = this.game;
    const p = player.pos;
    const diving = input.run; // Maj / Shift = piqué tête première

    // Animation de départ de l'oiseau qui s'éloigne vers le ciel
    if (this.bird.visible) {
      this._birdFlyAwayTimer = (this._birdFlyAwayTimer || 0) + dt;
      this.bird.position.y += 18 * dt;
      this.bird.position.x += Math.sin(this.heading) * 14 * dt;
      this.bird.position.z += Math.cos(this.heading) * 14 * dt;
      const flap = Math.sin(this.time * 9) * 0.45;
      this.bird.userData.wings[0].rotation.z = flap;
      this.bird.userData.wings[1].rotation.z = -flap;
      if (this._birdFlyAwayTimer > 2.5) {
        this.bird.visible = false;
      }
    }

    // 1. Direction souhaitée au clavier (ZQSD)
    input.moveVector(rig.forward, this.wish);
    const hasInput = this.wish.lengthSq() > 0.01;
    const maxH = diving ? 18 : 34;

    if (hasInput) {
      this.velocity.x += (this.wish.x * maxH - this.velocity.x) * damp(3.5, dt);
      this.velocity.z += (this.wish.z * maxH - this.velocity.z) * damp(3.5, dt);
    } else {
      // Glisse aérodynamique douce
      this.velocity.x += (0 - this.velocity.x) * damp(0.8, dt);
      this.velocity.z += (0 - this.velocity.z) * damp(0.8, dt);
    }

    // 2. Gravité, portance corporelle et vitesse terminale
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.speed = hSpeed;
    const terminalV = diving ? -65 : -38;
    const gravity = diving ? 38 : 25;
    this.velocity.y -= gravity * dt;
    // Portance : glisser horizontalement ralentit la chute (effet combinaison/ailes)
    this.velocity.y += (hSpeed / 34) * 8.5 * dt;
    this.velocity.y = Math.max(terminalV, this.velocity.y);

    // 3. Orientation & virages banqués du corps
    let headingDelta = 0;
    if (hSpeed > 0.8) {
      const desired = Math.atan2(this.velocity.x, this.velocity.z);
      headingDelta = (desired - this.heading + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      this.heading += headingDelta * damp(5.5, dt);
    }
    const turnRate = dt > 1e-4 ? headingDelta / dt : 0;
    const bankTarget = clamp(-turnRate * 0.45, -0.75, 0.75);
    this.bankAngle += (bankTarget - this.bankAngle) * damp(6.0, dt);

    // Angle d'inclinaison longitudinal
    const targetPitch = diving ? -1.1 : lerp(-0.25, -0.65, clamp(-this.velocity.y / 40, 0, 1));
    this.pitchAngle += (targetPitch - this.pitchAngle) * damp(4.0, dt);

    // 4. Intégration de la position
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    p.y += this.velocity.y * dt;

    // 5. Collision avec le sol ou l'eau
    const floor = groundAt(p.x, p.z).y;
    const depth = waterDepth(p.x, p.z);
    const isWater = floor < 0.35 || depth > 0.35;

    // Atterrissage au contact de la surface
    if (p.y <= floor + 0.3) {
      if (isWater) {
        // Plongeon dans l'eau
        p.y = 0;
        player.swimming = true;
        this.finishRide('swim');
        this.game.ui.toast(`Plongeon dans l'océan !`, { icon: 'water' });
        return;
      } else {
        // Atterrissage au sol avec amorti / roulade
        p.y = floor;
        this.finishRide('pickup');
        this.game.character.spawnDust(1);
        this.game.character.spawnDust(-1);
        this.game.ui.toast(`Atterrissage en chute libre réussi !`, { icon: 'leaf' });
        return;
      }
    }

    // 6. Synchronisation joueur
    player.facing = this.heading;
    player.vel.copy(this.velocity);
    player.actualSpeed = hSpeed;
    player.targetSpeed = maxH;
    player.sync();

    // 7. Caméra dynamique en chute libre
    const fallRatio = clamp((-this.velocity.y) / 55, 0, 1);
    const targetDist = lerp(18, 30, fallRatio);
    rig.distance += (targetDist - rig.distance) * damp(2.5, dt);
    rig.pitch += (lerp(0.38, 0.22, fallRatio) - rig.pitch) * damp(2.5, dt);
    rig.tilt += (this.bankAngle * 0.18 - rig.tilt) * damp(6.0, dt);
    const cam = this.game.camera;
    if (cam) {
      cam.rotation.z += (this.bankAngle * 0.18 - cam.rotation.z) * damp(6.0, dt);
    }

    // 8. Animation personnage (pose 'freefall')
    this.game.character.update(dt, Math.min(1, hSpeed / 34), { airRide: this, diving, vel: this.velocity, facing: this.heading });
  }
}
