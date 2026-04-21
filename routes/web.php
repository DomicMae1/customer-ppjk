<?php

use App\Http\Controllers\CustomerAttachController;
use App\Http\Controllers\CustomerLinkController;
use App\Http\Controllers\CustomersStatusController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PerusahaanController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SecureFileController;
use App\Http\Controllers\UserController;
use App\Models\Customers_Status;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\FileController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\ShippingController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Session;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
    return redirect('shipping');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return redirect('shipping');
    })->name('dashboard');

    Route::resource('customer', CustomerController::class);

    // Shipping-specific routes MUST be before resource route to avoid conflicts
    Route::post('shipping/upload-temp', [ShippingController::class, 'upload'])->name('shipping.upload');
    Route::post('shipping/{id}/update-hs-codes', [ShippingController::class, 'updateHsCodes'])
        ->name('shipping.update-hs-codes');
    Route::post('shipping/{id}/update-eta-date', [ShippingController::class, 'updateEtaDate'])->name('shipping.update-eta-date');
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

    Route::post('shipping/unified-save', [ShippingController::class, 'unifiedBatchSave'])->name('shipping.unifiedSave');
    Route::post('shipping/update-deadline', [ShippingController::class, 'updateDeadline'])->name('shipping.updateDeadline');
    Route::get('shipping/{id}/download-zip', [ShippingController::class, 'downloadZip'])->name('shipping.downloadZip');
    Route::get('/shipping/available-sections', [ShippingController::class, 'availableSections']);
    Route::post('/shipping/add-sections-to-spk', [ShippingController::class, 'addSectionsToSpk']);
    Route::post('/shipping/remove-section', [ShippingController::class, 'removeSectionFromSpk']);

    // Resource route AFTER specific routes
    Route::resource('shipping', ShippingController::class);
    Route::resource('users', UserController::class);
    Route::resource('role-manager', RoleController::class);
    Route::resource('perusahaan', PerusahaanController::class);
    Route::resource('document', DocumentController::class);
    Route::resource('section', SectionController::class);

    // Notification routes
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unreadCount');
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');

    Route::post('document/upload-temp', [DocumentController::class, 'upload'])->name('document.upload');
    Route::delete('document/{id}', [DocumentController::class, 'destroy'])->name('documents.destroy');
});

Route::get('/file/view/{path}', [FileController::class, 'view'])->middleware('auth')
    ->where('path', '.*')
    ->name('file.view');

Route::get('/shipping/{path}', [FileController::class, 'view'])
    ->where('path', '.*')
    ->name('file.view');

Route::get('lang/{locale}', function ($locale) {
    if (in_array($locale, ['en', 'id'])) {
        Session::put('locale', $locale);
    }
    return redirect()->back();
})->name('switch.language');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
