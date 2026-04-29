<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Models\Wallet;
use App\Models\Stat;
use App\Models\Account;
use App\Models\Node;

class Distributor extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The primary key for the distributors table.
     */
    protected $primaryKey = 'distributor_id';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'phone',
        'email',
        'password',
        'rank',
        'income_monthly',
        'income_weekly',
        'income_yearly',
        'is_paid',
        'join_date',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Attribute casting.
     */
    protected function casts(): array
    {
        return [
            'password'       => 'hashed',
            'is_paid'        => 'boolean',
            'join_date'      => 'date',
            'income_monthly' => 'decimal:2',
            'income_weekly'  => 'decimal:2',
            'income_yearly'  => 'decimal:2',
        ];
    }

    /**
     * Always append 'role' so the frontend can check user.role
     */
    protected $appends = ['role'];

    /**
     * Get the role attribute for frontend routing compatibility.
     */
    public function getRoleAttribute(): string
    {
        return 'distributor';
    }

    // ─── Rank label helper ────────────────────────────────────────────────────

    /**
     * Human-readable rank labels keyed by enum value.
     */
    public static array $rankLabels = [
        'CT'  => 'Customer Trainee',
        'MT'  => 'Market Trainee',
        'TT'  => 'Team Trainee',
        'NTB' => 'National Team Builder',
        'IBB' => 'International Business Builder',
        'GEB' => 'Global Empire Builder',
        'CA'  => 'Crown Achiever',
        'AL'  => 'Alpha Legend',
    ];

    /**
     * Returns the full label for the distributor's current rank.
     */
    public function getRankLabelAttribute(): string
    {
        return self::$rankLabels[$this->rank] ?? $this->rank;
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    /** All prospects assigned to this distributor */
    public function prospects()
    {
        return $this->hasMany(Prospect::class, 'distributor_id', 'distributor_id');
    }

    /** All follow-ups carried out by this distributor */
    public function followups()
    {
        return $this->hasMany(Followup::class, 'distributor_id', 'distributor_id');
    }

    /** All closing attempts made by this distributor */
    public function closingAttempts()
    {
        return $this->hasMany(ClosingAttempt::class, 'distributor_id', 'distributor_id');
    }

    /** Wallet (1-to-1) */
    public function wallet()
    {
        return $this->hasOne(Wallet::class, 'distributor_id', 'distributor_id');
    }

    /** MLM Stats (1-to-1) */
    public function stat()
    {
        return $this->hasOne(Stat::class, 'distributor_id', 'distributor_id');
    }

    /** MLM Accounts (1-to-many: one per product purchased) */
    public function accounts()
    {
        return $this->hasMany(Account::class, 'distributor_id', 'distributor_id');
    }

    /** Placement nodes in the binary tree */
    public function nodes()
    {
        return $this->hasMany(Node::class, 'distributor_id', 'distributor_id');
    }
}
