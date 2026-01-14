<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;
    
    // Connection managed by stancl/tenancy - no hardcoded connection needed
    protected $table = 'notification'; // FIX: Database uses 'notification' (singular)
    protected $primaryKey = 'id_notification'; // FIX: Table uses id_notification, not id

    protected $fillable = [
        'user_id',
        'role',
        'id_section',    // NEW: dedicated section column
        'id_spk',
        'id_dokumen',
        'data',          // Contains: type, title, message, url, etc.
        'read_at',
    ];
    // type, title, message removed - now in data JSON

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Override toArray to include 'id' for frontend compatibility
     */
    public function toArray()
    {
        $array = parent::toArray();
        $array['id'] = $this->id_notification; // Explicitly add 'id' for frontend
        return $array;
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(DocumentTrans::class, 'id_dokumen', 'id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope untuk filter notifikasi yang belum dibaca
     */
    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    /**
     * Scope untuk filter notifikasi untuk user tertentu
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }




    /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Mark notification as read
     */
    public function markAsRead()
    {
        $this->update(['read_at' => now()]);
    }

    /**
     * Check if notification is read
     */
    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    /**
     * Check if notification is unread
     */
    public function isUnread(): bool
    {
        return $this->read_at === null;
    }
}
