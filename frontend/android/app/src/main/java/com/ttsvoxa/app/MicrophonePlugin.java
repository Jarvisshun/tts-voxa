package com.ttsvoxa.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.media.MediaRecorder;
import android.util.Base64;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(
    name = "TtsVoxaMicrophone",
    permissions = {
        @Permission(strings = {Manifest.permission.RECORD_AUDIO}, alias = "microphone")
    }
)
public class MicrophonePlugin extends Plugin {

    private MediaRecorder recorder;
    private File outputFile;
    private CompletableFuture<Void> permissionFuture;

    @PluginMethod
    public void checkMicPermission(PluginCall call) {
        int result = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO);
        JSObject ret = new JSObject();
        ret.put("granted", result == PackageManager.PERMISSION_GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestMicPermission(PluginCall call) {
        int result = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO);
        if (result == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        permissionFuture = new CompletableFuture<>();
        bridge.saveCall(call);
        ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.RECORD_AUDIO}, 9001);

        try {
            permissionFuture.get(10, TimeUnit.SECONDS);
        } catch (Exception e) {
            permissionFuture = null;
            JSObject ret = new JSObject();
            ret.put("granted", false);
            ret.put("error", "Permission request timed out");
            call.resolve(ret);
            return;
        }

        permissionFuture = null;
        int newResult = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO);
        JSObject ret = new JSObject();
        ret.put("granted", newResult == PackageManager.PERMISSION_GRANTED);
        call.resolve(ret);
    }

    @PermissionCallback
    private void onPermissionResult(PluginCall call) {
        if (permissionFuture != null) {
            permissionFuture.complete(null);
        }
    }

    @PluginMethod
    public void startMicRecording(PluginCall call) {
        int result = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO);
        if (result != PackageManager.PERMISSION_GRANTED) {
            call.reject("Microphone permission not granted");
            return;
        }

        if (recorder != null) {
            call.reject("Recording already in progress");
            return;
        }

        try {
            File cacheDir = getContext().getCacheDir();
            outputFile = File.createTempFile("rec_", ".m4a", cacheDir);

            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioChannels(1);
            recorder.setAudioSamplingRate(44100);
            recorder.setAudioEncodingBitRate(96000);
            recorder.setOutputFile(outputFile.getAbsolutePath());
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.prepare();
            recorder.start();

            JSObject ret = new JSObject();
            ret.put("status", "recording");
            call.resolve(ret);
        } catch (IOException e) {
            recorder = null;
            call.reject("Failed to start recording: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopMicRecording(PluginCall call) {
        if (recorder == null) {
            call.reject("No recording in progress");
            return;
        }

        try {
            recorder.stop();
            recorder.release();
            recorder = null;

            byte[] fileBytes = readFileBytes(outputFile);
            String base64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP);

            JSObject ret = new JSObject();
            ret.put("base64", base64);
            ret.put("format", "m4a");
            ret.put("size", fileBytes.length);
            call.resolve(ret);
        } catch (Exception e) {
            recorder = null;
            call.reject("Failed to stop recording: " + e.getMessage());
        }
    }

    private byte[] readFileBytes(File file) throws IOException {
        byte[] bytes = new byte[(int) file.length()];
        try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(file))) {
            bis.read(bytes);
        }
        return bytes;
    }
}
