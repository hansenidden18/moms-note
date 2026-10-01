package com.hayati.notahayati;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import android.Manifest;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.view.KeyEvent;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Runs against a fresh emulator, never a user's invoice store. */
@RunWith(AndroidJUnit4.class)
public class InvoiceAppTest {
    private String js(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(script, value -> {result.set(value); latch.countDown();}));
        assertTrue("JavaScript evaluation completed", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }
    private void waitFor(ActivityScenario<MainActivity> scenario, String condition) throws Exception {
        for (int i = 0; i < 100; i++) { if ("true".equals(js(scenario,condition))) return; Thread.sleep(200); }
        fail("App did not reach expected state: " + condition);
    }
    @Test public void bundledOfflineAppCreatesAndRetainsAnInvoice() throws Exception {
        android.content.Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), PackageManager.GET_PERMISSIONS);
        assertFalse("App cannot access the internet", info.requestedPermissions != null && Arrays.asList(info.requestedPermissions).contains(Manifest.permission.INTERNET));
        assertEquals("Automatic cloud backup is disabled", 0, context.getApplicationInfo().flags & ApplicationInfo.FLAG_ALLOW_BACKUP);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitFor(scenario,"document.body.innerText.includes('Buat Nota Baru')");
            assertEquals("\"android\"",js(scenario,"window.Capacitor.getPlatform()"));
            assertEquals("true",js(scenario,"window.Capacitor.isPluginAvailable('InvoicePrinter') && window.Capacitor.isPluginAvailable('Share') && window.Capacitor.isPluginAvailable('Filesystem')"));
            js(scenario,"Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Buat Nota Baru')).click()");
            waitFor(scenario,"document.querySelector('[aria-label=\"Nama barang 1\"]')!==null");
            js(scenario,"(()=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for(const [name,value] of [['Nama barang 1','CONTOH Bolen'],['Banyaknya 1','10'],['Harga satuan 1','4300']]){const el=document.querySelector('[aria-label=\"'+name+'\"]');set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}return true})()");
            waitFor(scenario,"document.body.innerText.includes('43.000')");
            js(scenario,"Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Simpan & Lihat Nota')).click()");
            waitFor(scenario,"document.body.innerText.includes('Nota Siap, Ibu.')");
            waitFor(scenario,"Array.from(document.images).some(i=>i.alt==='Stempel Hayati Cake and Bakery' && i.complete && i.naturalWidth>0)");
            assertEquals("true",js(scenario,"document.body.innerText.includes('081326203778') && document.body.innerText.includes('43.000')"));
            js(scenario,"Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('PDF / Bagikan')).click()");
            File[] exports = null;
            for (int i = 0; i < 100; i++) {
                exports = new File(context.getCacheDir(), "exports").listFiles((dir, name) -> name.endsWith(".pdf"));
                if (exports != null && exports.length > 0 && exports[0].length() > 1000) break;
                Thread.sleep(200);
            }
            assertNotNull("PDF export stays in local cache", exports);
            assertTrue("PDF export works without internet permission", exports.length > 0 && exports[0].length() > 1000);
            try (FileInputStream file = new FileInputStream(exports[0])) {
                byte[] header = new byte[5];
                assertEquals(5, file.read(header));
                assertEquals("%PDF-", new String(header, StandardCharsets.US_ASCII));
            }
            // Close the share chooser without sending the test invoice to another app.
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            scenario.recreate();
            waitFor(scenario,"document.body.innerText.includes('CONTOH Bolen')");
            assertEquals("true",js(scenario,"document.body.innerText.includes('43.000')"));
        }
    }
}
