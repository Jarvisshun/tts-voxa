package com.ttsvoxa.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "TTSVoxa";
    private static final int FILE_CHOOSER_REQUEST = 100;
    private ValueCallback<Uri[]> fileUploadCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Global crash handler — log to logcat before crashing
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught exception on " + thread.getName(), throwable);
            // Let the default handler kill the process
            System.exit(1);
        });

        try {
            // Register custom microphone plugin BEFORE super.onCreate
            registerPlugin(MicrophonePlugin.class);
            super.onCreate(savedInstanceState);

            getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onShowFileChooser(WebView webView,
                        ValueCallback<Uri[]> filePathCallback,
                        FileChooserParams fileChooserParams) {
                    if (fileUploadCallback != null) {
                        fileUploadCallback.onReceiveValue(null);
                    }
                    fileUploadCallback = filePathCallback;

                    Intent intent = fileChooserParams.createIntent();
                    try {
                        startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    } catch (Exception e) {
                        Log.e(TAG, "File chooser launch failed", e);
                        fileUploadCallback = null;
                        return false;
                    }
                    return true;
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize MainActivity", e);
            // Don't crash — let the web layer handle gracefully
            try {
                super.onCreate(savedInstanceState);
            } catch (Exception e2) {
                Log.e(TAG, "super.onCreate also failed", e2);
                finish();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        }
    }
}
