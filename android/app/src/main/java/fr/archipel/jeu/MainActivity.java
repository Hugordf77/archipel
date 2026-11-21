package fr.archipel.jeu;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

/**
 * Archipel sur Android : le jeu web construit (dist/, copié dans assets/www/ par le workflow) tourne
 * dans une WebView plein écran. Les fichiers sont servis depuis l'APK sous une adresse https fixe
 * (https://appassets.androidplatform.net/), sans réseau : modules JavaScript, Worker de génération,
 * sons et polices s'y chargent comme sur le serveur de développement, et la sauvegarde (IndexedDB)
 * reste attachée à cette adresse d'une version à l'autre.
 */
public class MainActivity extends Activity {

    private static final String HOTE = "appassets.androidplatform.net";
    private static final String RACINE = "www";

    private WebView web;

    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        // version de débogage : la page s'inspecte depuis chrome://inspect sur l'ordinateur
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        web = new WebView(this);
        web.setBackgroundColor(0xFFCFE9EA);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView vue, WebResourceRequest requete) {
                return servir(requete.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView vue, WebResourceRequest requete) {
                // le jeu ne quitte jamais ses propres fichiers
                return !HOTE.equals(requete.getUrl().getHost());
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        setContentView(web);
        pleinEcran();

        if (etat != null) web.restoreState(etat);
        else web.loadUrl("https://" + HOTE + "/index.html");
    }

    /** Fichier du jeu demandé par la WebView, lu dans assets/www/ ; null : requête laissée à la WebView. */
    private WebResourceResponse servir(Uri adresse) {
        if (!HOTE.equals(adresse.getHost())) return null;
        String chemin = adresse.getPath();
        if (chemin == null || chemin.isEmpty() || chemin.equals("/")) chemin = "/index.html";
        String type = typeDe(chemin);
        String codage = type.startsWith("text/") || type.endsWith("json") || type.endsWith("+xml") ? "utf-8" : null;
        try {
            InputStream flux = getAssets().open(RACINE + chemin);
            return new WebResourceResponse(type, codage, flux);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Introuvable", null,
                new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String typeDe(String chemin) {
        String ext = chemin.substring(chemin.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        switch (ext) {
            case "html": return "text/html";
            case "js":
            case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "woff": return "font/woff";
            case "woff2": return "font/woff2";
            case "mp3": return "audio/mpeg";
            case "m4a": return "audio/mp4";
            case "wav": return "audio/wav";
            case "wasm": return "application/wasm";
            default: return "application/octet-stream";
        }
    }

    /** Barres du système cachées ; un glissement depuis le bord les fait revenir un instant. */
    @SuppressWarnings("deprecation")
    private void pleinEcran() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) pleinEcran();
    }

    /** Retour : comme Échap dans le jeu (ferme un panneau, revient en arrière dans le menu du titre). */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript(
            "window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape'}));"
                + "window.dispatchEvent(new KeyboardEvent('keyup',{code:'Escape',key:'Escape'}));",
            null);
    }

    @Override
    protected void onPause() {
        // l'application passe en arrière-plan : le jeu enregistre la partie (comme à la fermeture d'un onglet)
        web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'));", null);
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        pleinEcran();
    }

    @Override
    protected void onSaveInstanceState(Bundle etat) {
        super.onSaveInstanceState(etat);
        web.saveState(etat);
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
