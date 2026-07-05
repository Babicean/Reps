package com.babicean.reps;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();

        // Reps never shows scrollbars; the overscroll stretch is the
        // only scroll signal.
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // WebView multiplies all web text by the system font-size setting
        // (textZoom), which distorts the layout differently on every
        // phone. Lock it to 100: the app's own type scale (already large)
        // is the design, identical on every device.
        WebSettings settings = webView.getSettings();
        settings.setTextZoom(100);
    }
}
