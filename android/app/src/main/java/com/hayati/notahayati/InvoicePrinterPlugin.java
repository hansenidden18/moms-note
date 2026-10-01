package com.hayati.notahayati;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.pdf.PdfDocument;
import android.graphics.pdf.PdfRenderer;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.print.pdf.PrintedPdfDocument;
import android.util.Base64;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;

@CapacitorPlugin(name="InvoicePrinter")
public class InvoicePrinterPlugin extends Plugin {
    @PluginMethod public void print(PluginCall call) {
        String encoded = call.getString("base64");
        if (encoded == null || encoded.length() > 60000000) { call.reject("PDF tidak valid atau terlalu besar untuk dicetak."); return; }
        final File file;
        try {
            file = File.createTempFile("hayati-print-", ".pdf", getContext().getCacheDir());
            try (FileOutputStream output = new FileOutputStream(file)) { output.write(Base64.decode(encoded, Base64.DEFAULT)); }
        } catch (Exception error) { call.reject("PDF belum bisa disiapkan untuk dicetak.", error); return; }
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                if (manager == null) throw new IllegalStateException("Print service unavailable");
                manager.print("Nota Hayati", new Adapter(file, getContext()), new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setColorMode(PrintAttributes.COLOR_MODE_COLOR).build());
                call.resolve();
            } catch (Exception error) { file.delete(); call.reject("Pencetakan belum tersedia. Gunakan PDF / Bagikan.", error); }
        });
    }
    private static class Adapter extends PrintDocumentAdapter {
        final File source;
        final Context context;
        PrintAttributes attributes;
        int count;
        Adapter(File source, Context context) { this.source = source; this.context = context; }
        @Override public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes, CancellationSignal signal, LayoutResultCallback callback, Bundle extras) {
            attributes = newAttributes;
            if (signal.isCanceled()) { callback.onLayoutCancelled(); return; }
            try (ParcelFileDescriptor descriptor = ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY); PdfRenderer renderer = new PdfRenderer(descriptor)) {
                count = renderer.getPageCount();
                callback.onLayoutFinished(new PrintDocumentInfo.Builder("Nota-Hayati.pdf").setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).setPageCount(count).build(), !newAttributes.equals(oldAttributes));
            } catch (Exception error) { callback.onLayoutFailed("PDF belum bisa dibuka."); }
        }
        private boolean requested(int index, PageRange[] ranges) { for (PageRange range : ranges) if (index >= range.getStart() && index <= range.getEnd()) return true; return false; }
        @Override public void onWrite(PageRange[] ranges, ParcelFileDescriptor destination, CancellationSignal signal, WriteResultCallback callback) {
            if (signal.isCanceled()) { callback.onWriteCancelled(); return; }
            try (ParcelFileDescriptor input = ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY); PdfRenderer renderer = new PdfRenderer(input); PrintedPdfDocument document = new PrintedPdfDocument(context, attributes); FileOutputStream out = new FileOutputStream(destination.getFileDescriptor())) {
                ArrayList<PageRange> written = new ArrayList<>();
                for (int index = 0; index < count; index++) {
                    if (signal.isCanceled()) { callback.onWriteCancelled(); return; }
                    if (!requested(index, ranges)) continue;
                    try (PdfRenderer.Page page = renderer.openPage(index)) {
                        // Bound memory to one 200 DPI page, retaining all requested pages.
                        float scale = Math.min(200f / 72f, 2800f / Math.max(page.getWidth(), page.getHeight()));
                        Bitmap bitmap = Bitmap.createBitmap(Math.round(page.getWidth() * scale), Math.round(page.getHeight() * scale), Bitmap.Config.ARGB_8888);
                        bitmap.eraseColor(Color.WHITE);
                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT);
                        PdfDocument.Page printed = document.startPage(index + 1);
                        Canvas canvas = printed.getCanvas();
                        Rect area = printed.getInfo().getContentRect();
                        float fit = Math.min((float) area.width() / bitmap.getWidth(), (float) area.height() / bitmap.getHeight());
                        float width = bitmap.getWidth() * fit, height = bitmap.getHeight() * fit;
                        RectF target = new RectF(area.left + (area.width() - width) / 2, area.top + (area.height() - height) / 2, area.left + (area.width() + width) / 2, area.top + (area.height() + height) / 2);
                        canvas.drawBitmap(bitmap, null, target, new android.graphics.Paint(android.graphics.Paint.FILTER_BITMAP_FLAG));
                        document.finishPage(printed);
                        bitmap.recycle();
                        written.add(new PageRange(index, index));
                    }
                }
                document.writeTo(out);
                callback.onWriteFinished(written.toArray(new PageRange[0]));
            } catch (Exception error) { callback.onWriteFailed("Pencetakan gagal. Coba simpan PDF dahulu."); }
        }
        @Override public void onFinish() { source.delete(); }
    }
}
