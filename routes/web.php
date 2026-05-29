<?php

use App\Http\Controllers\AdminCompanyContextController;
use App\Http\Controllers\CeisaSettingController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PerusahaanController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\ShippingController;
use App\Http\Controllers\ShippingPackageController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Session;

Route::get('/', function () {
    return redirect('shipping');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return redirect('shipping');
    })->name('dashboard');

    Route::post('admin/company-context', [AdminCompanyContextController::class, 'update'])->name('admin.company-context.update');

    Route::resource('customer', CustomerController::class);

    // Shipping-specific routes MUST be before resource route to avoid conflicts
    Route::post('shipping/upload-temp', [ShippingController::class, 'upload'])->name('shipping.upload');
    Route::post('shipping/merged-pdf-upload', [ShippingController::class, 'uploadMergedPdf'])->name('shipping.uploadMergedPdf');
    Route::post('shipping/{id}/update-hs-codes', [ShippingController::class, 'updateHsCodes'])
        ->name('shipping.update-hs-codes');
    Route::post('shipping/{id}/update-eta-date', [ShippingController::class, 'updateEtaDate'])->name('shipping.update-eta-date');
    Route::post('shipping/{id}/update-etd-date', [ShippingController::class, 'updateEtdDate'])->name('shipping.update-etd-date');
    Route::post('shipping/{id}/update-job-date', [ShippingController::class, 'updateJobDate'])->name('shipping.update-job-date');
    Route::post('shipping/{id}/update-inspection-date', [ShippingController::class, 'updateInspectionDate'])->name('shipping.update-inspection-date');
    Route::post('shipping/{id}/assign-staff', [ShippingController::class, 'assignStaff'])->name('shipping.assignStaff');
    Route::get('shipping/available-documents', [ShippingController::class, 'getAvailableDocuments'])->name('shipping.availableDocuments');
    Route::post('shipping/add-documents-to-section', [ShippingController::class, 'addDocumentsToSection'])->name('shipping.addDocumentsToSection');
    Route::post('shipping/update-penjaluran', [ShippingController::class, 'updatePenjaluran'])->name('shipping.updatePenjaluran');
    Route::post('shipping/update-internal-can-upload', [ShippingController::class, 'updateInternalCanUpload'])->name('shipping.updateInternalCanUpload');
    Route::get('shipping/documents/{id}', [ShippingController::class, 'share'])->name('shipping.dataShippingView');
    Route::get('shipping/{id}/pdf', [ShippingController::class, 'downloadPdf']);
    Route::post('shipping/{id}/update-form-fields', [ShippingController::class, 'updateFormFields'])->name('shipping.update-form-fields');
    Route::post('shipping/{id}/update-ori-dates', [ShippingController::class, 'updateOriDates'])->name('shipping.update-ori-dates');
    Route::post('shipping/{id}/update-npd', [ShippingController::class, 'updateNpd'])->name('shipping.updateNpd');
    Route::get('shipping/{id}/npd-info', [ShippingController::class, 'getNpdInfo'])->name('shipping.getNpdInfo');
    Route::post('shipping/{id}/send-email', [ShippingController::class, 'sendEmail'])->name('shipping.sendEmail');
    Route::post('shipping/unified-save', [ShippingController::class, 'unifiedBatchSave'])->name('shipping.unifiedSave');
    Route::post('shipping/update-deadline', [ShippingController::class, 'updateDeadline'])->name('shipping.updateDeadline');
    Route::post('shipping/{id}/ceisa-track', [ShippingController::class, 'trackCeisaSubmission'])->name('shipping.ceisaTrack');
    Route::post('shipping/{id}/ceisa-submissions/{submission}/sync', [ShippingController::class, 'syncCeisaSubmission'])->name('shipping.ceisaSync');
    Route::get('shipping/{id}/ceisa-response-documents/{document}/download', [ShippingController::class, 'downloadCeisaResponseDocument'])->name('shipping.ceisaResponseDocument');
    Route::get('shipping/{id}/download-zip', [ShippingController::class, 'downloadZip'])->name('shipping.downloadZip');
    Route::get('/shipping/available-sections', [ShippingController::class, 'availableSections']);
    Route::post('/shipping/add-sections-to-spk', [ShippingController::class, 'addSectionsToSpk']);
    Route::post('/shipping/remove-section', [ShippingController::class, 'removeSectionFromSpk']);
    Route::post('/shipping/document/{id}/remove', [ShippingController::class, 'removeDocumentFromSection'])->name('shipping.removeDocumentFromSection');

    // Resource route AFTER specific routes
    Route::resource('shipping', ShippingController::class);
    Route::resource('users', UserController::class);
    Route::resource('role-manager', RoleController::class);
    Route::resource('perusahaan', PerusahaanController::class);
    Route::resource('document', DocumentController::class);
    Route::resource('section', SectionController::class);

    Route::get('shipping-packages', [ShippingPackageController::class, 'index'])->name('shipping-packages.index');
    Route::get('shipping-packages/companies/{idPerusahaan}/data', [ShippingPackageController::class, 'companyData'])->name('shipping-packages.company-data');
    Route::post('shipping-packages', [ShippingPackageController::class, 'store'])->name('shipping-packages.store');
    Route::put('shipping-packages/{id}', [ShippingPackageController::class, 'update'])->name('shipping-packages.update');
    Route::delete('shipping-packages/{id}', [ShippingPackageController::class, 'destroy'])->name('shipping-packages.destroy');

    // Notification Settings routes
    Route::get('notification-settings', [\App\Http\Controllers\NotificationSettingController::class, 'index'])->name('notification_settings.index');
    Route::get('notification-settings/companies/{id}/data', [\App\Http\Controllers\NotificationSettingController::class, 'getSettings'])->name('notification_settings.data');
    Route::post('notification-settings/channel', [\App\Http\Controllers\NotificationSettingController::class, 'upsertChannel'])->name('notification_settings.upsertChannel');
    Route::post('notification-settings/reminder', [\App\Http\Controllers\NotificationSettingController::class, 'upsertReminder'])->name('notification_settings.upsertReminder');

    Route::get('ceisa-settings', [CeisaSettingController::class, 'index'])->name('ceisa-settings.index');
    Route::get('ceisa-settings/companies/{idPerusahaan}', [CeisaSettingController::class, 'show'])->name('ceisa-settings.show');
    Route::post('ceisa-settings', [CeisaSettingController::class, 'upsert'])->name('ceisa-settings.upsert');
    Route::post('ceisa-settings/test', [CeisaSettingController::class, 'test'])->name('ceisa-settings.test');
    Route::post('ceisa-settings/reference', [CeisaSettingController::class, 'reference'])->name('ceisa-settings.reference');
    Route::post('ceisa-settings/status', [CeisaSettingController::class, 'status'])->name('ceisa-settings.status');

    // Notification routes
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unreadCount');
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');

    Route::post('document/upload-temp', [DocumentController::class, 'upload'])->name('document.upload');
    Route::delete('document/{id}', [DocumentController::class, 'destroy'])->name('documents.destroy');

    Route::get('customer/{id}/emails', [CustomerController::class, 'getEmails'])->name('customer.emails');
});

Route::get('/file/view/{path}', [FileController::class, 'view'])->middleware('auth')
    ->where('path', '.*')
    ->name('file.view');

Route::get('/shipping/{path}', [FileController::class, 'view'])->middleware('auth')
    ->where('path', '.*')
    ->name('file.view');

Route::get('lang/{locale}', function ($locale) {
    if (in_array($locale, ['en', 'id'])) {
        Session::put('locale', $locale);
    }

    return redirect()->back();
})->name('switch.language');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
