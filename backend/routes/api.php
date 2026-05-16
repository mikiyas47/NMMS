<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\GoalController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/all-users', [AuthController::class, 'index']);
Route::post('/users', [AuthController::class, 'storeUser']);
Route::put('/users/{id}', [AuthController::class, 'update']);
Route::patch('/users/{id}/status', [AuthController::class, 'toggleStatus']);
Route::middleware('auth:sanctum,api')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/profile/password', [AuthController::class, 'updatePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::get('/products', [\App\Http\Controllers\ProductController::class, 'index']);
Route::middleware('auth:sanctum,api')->group(function () {
    Route::post('/products', [\App\Http\Controllers\ProductController::class, 'store']);
    Route::put('/products/{product}', [\App\Http\Controllers\ProductController::class, 'update']);
    Route::delete('/products/{product}', [\App\Http\Controllers\ProductController::class, 'destroy']);
});

// ── Contacts (raw contact storage) ───────────────────────────────────────────
Route::middleware('auth:sanctum,api')->group(function () {
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::post('/contacts', [ContactController::class, 'store']);
    Route::get('/contacts/followups', [ContactController::class, 'followups']);
    Route::get('/contacts/closings', [ContactController::class, 'closings']);
    Route::get('/contacts/{id}', [ContactController::class, 'show']);
    Route::put('/contacts/{id}', [ContactController::class, 'update']);
    Route::delete('/contacts/{id}', [ContactController::class, 'destroy']);
    Route::post('/contacts/{id}/followups', [ContactController::class, 'storeFollowup']);
    Route::post('/contacts/{id}/closings', [ContactController::class, 'storeClosing']);
    Route::post('/contacts/{id}/convert', [\App\Http\Controllers\Api\ProspectController::class, 'convertContact']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Prospects (pipeline CRM) ──────────────────────────────────────────────────
use App\Http\Controllers\Api\ProspectController;
// Use distinct top-level paths to avoid any {id} wildcard collision
Route::middleware('auth:sanctum,api')->get('/prospect-dashboard', [ProspectController::class, 'dashboard']);
Route::middleware('auth:sanctum,api')->get('/prospect-pipeline',  [ProspectController::class, 'pipeline']);

Route::middleware('auth:sanctum,api')->group(function () {
    Route::get('/prospects',           [ProspectController::class, 'index']);
    Route::post('/prospects',          [ProspectController::class, 'store']);
    Route::get('/prospects/{id}',      [ProspectController::class, 'show']);
    Route::put('/prospects/{id}',      [ProspectController::class, 'update']);
    Route::delete('/prospects/{id}',   [ProspectController::class, 'destroy']);
    Route::patch('/prospects/{id}/stage',     [ProspectController::class, 'moveStage']);
    Route::post('/prospects/{id}/followups',  [ProspectController::class, 'storeFollowup']);
    Route::post('/prospects/{id}/closings',   [ProspectController::class, 'storeClosing']);
    Route::post('/prospects/{id}/notes',      [ProspectController::class, 'addNote']);
    Route::get('/prospects/{id}/activities',  [ProspectController::class, 'activities']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Temporary: backfill wallet balances from paid commissions ────────────────
Route::get('/cleanup-nodes/{id1}/{id2}', function ($id1, $id2) {
    if (function_exists('opcache_reset')) {
        opcache_reset();
    }
    $ids = [(int)$id1, (int)$id2];
    $accounts = \App\Models\Account::whereIn('id', $ids)->delete();
    $nodes = \App\Models\Node::whereIn('id', $ids)->delete();
    
    $stat = \App\Models\Stat::where('distributor_id', 41)->first();
    if ($stat) {
        $stat->own_points = 800;
        $stat->save();
    }
    
    return response()->json([
        'message' => "Cleaned up",
        'accounts_deleted' => $accounts,
        'nodes_deleted' => $nodes
    ]);
});

Route::get('/backfill-wallets', function () {
    $payments = \App\Models\Payment::where('status', 'success')
        ->where('commission_paid', true)
        ->get();

    $credited = [];

    foreach ($payments as $payment) {
        if ($payment->commission_amount <= 0) continue;

        $wallet = \App\Models\Wallet::firstOrCreate(['distributor_id' => $payment->distributor_id]);

        // Only backfill if wallet balance is less than what income_monthly shows
        // to avoid double-crediting distributors who already have correct wallets
        $dist = \App\Models\Distributor::where('distributor_id', $payment->distributor_id)->first();
        if (!$dist) continue;

        $credited[$payment->distributor_id] = ($credited[$payment->distributor_id] ?? 0) + $payment->commission_amount;
    }

    $updated = 0;
    foreach ($credited as $distId => $totalCommission) {
        $wallet = \App\Models\Wallet::firstOrCreate(['distributor_id' => $distId]);
        // Only update if wallet is lower than total commissions earned
        if ($wallet->total_earned < $totalCommission) {
            $diff = $totalCommission - $wallet->total_earned;
            $wallet->balance      += $diff;
            $wallet->total_earned  = $totalCommission;
            $wallet->save();
            $updated++;
        }
    }

    return response()->json([
        'message'  => "Backfilled {$updated} wallets",
        'total_distributors_with_commissions' => count($credited),
    ]);
});
// ─────────────────────────────────────────────────────────────────────────────
Route::get('/clear-cache', function () {
    \Illuminate\Support\Facades\Artisan::call('route:clear');
    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('cache:clear');
    \Illuminate\Support\Facades\Artisan::call('view:clear');
    \Illuminate\Support\Facades\Artisan::call('optimize:clear');
    return response()->json([
        'message' => 'All caches cleared',
        'routes_cleared' => true,
        'output' => \Illuminate\Support\Facades\Artisan::output(),
    ]);
});

// ── Temporary: test prospects dashboard for a distributor ────────────────────
Route::get('/test-prospects/{email}', function ($email) {
    try {
        $dist = \App\Models\Distributor::where('email', $email)->first();
        if (!$dist) return response()->json(['error' => 'Not found']);
        $distId = $dist->distributor_id;

        $all = \App\Models\Prospect::where('distributor_id', $distId)->get();
        $stageCounts = [];
        foreach (\App\Models\Prospect::STAGES as $stage) {
            $stageCounts[$stage] = $all->where('stage', $stage)->count();
        }

        return response()->json([
            'ok'           => true,
            'distributor'  => $dist->name,
            'total_prospects' => $all->count(),
            'stage_counts' => $stageCounts,
            'new_columns_exist' => \Illuminate\Support\Facades\Schema::hasColumn('prospects', 'stage'),
            'activities_table'  => \Illuminate\Support\Facades\Schema::hasTable('prospect_activities'),
        ]);
    } catch (\Throwable $e) {
        return response()->json(['error' => $e->getMessage(), 'line' => $e->getLine()], 500);
    }
});

// ── Temporary: test full dashboard logic for a distributor ────────────────────
// v2 - force redeploy
Route::get('/test-dashboard/{email}', function ($email) {
    try {
        $dist = \App\Models\Distributor::where('email', $email)->first();
        if (!$dist) return response()->json(['error' => 'Not found']);
        $distId = $dist->distributor_id;
        $today  = \Carbon\Carbon::today();

        $all = \App\Models\Prospect::where('distributor_id', $distId)->get();

        $hotLeads = $all->filter(fn($p) =>
            $p->interest_score >= 70 &&
            !in_array($p->stage, ['Joined', 'Rejected', 'Inactive'])
        )->sortByDesc('interest_score')->take(5)->values();

        $overdue = $all->filter(fn($p) =>
            $p->next_action_date &&
            \Carbon\Carbon::parse($p->next_action_date)->isPast() &&
            !\Carbon\Carbon::parse($p->next_action_date)->isToday() &&
            !in_array($p->stage, ['Joined', 'Rejected'])
        )->values();

        $stageCounts = [];
        foreach (\App\Models\Prospect::STAGES as $stage) {
            $stageCounts[$stage] = $all->where('stage', $stage)->count();
        }

        return response()->json([
            'ok'          => true,
            'total'       => $all->count(),
            'hot_leads'   => $hotLeads->count(),
            'overdue'     => $overdue->count(),
            'stage_counts'=> $stageCounts,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'file'  => basename($e->getFile()),
            'line'  => $e->getLine(),
            'trace' => collect(explode("\n", $e->getTraceAsString()))->take(5)->toArray(),
        ], 500);
    }
});
// ─────────────────────────────────────────────────────────────────────────────
Route::get('/test-engine/{email}', function ($email) {
    try {
        $dist = \App\Models\Distributor::where('email', $email)->first();
        if (!$dist) return response()->json(['error' => 'Distributor not found']);

        $distributorId = $dist->distributor_id;
        $stat   = \App\Models\Stat::where('distributor_id', $distributorId)->first();
        $wallet = \App\Models\Wallet::where('distributor_id', $distributorId)->first();
        $mlm    = new \App\Services\MlmEngineService();

        $currentRank = $stat?->rank ?? 'CT';
        $ownPoints   = (int)($stat?->own_points ?? 0);
        $rootNode    = \App\Models\Node::where('distributor_id', $distributorId)->orderBy('id')->first();
        $totalPoints = $rootNode ? $mlm->getSubtreeVolume($rootNode->id) : $ownPoints;
        $directCount = $rootNode ? $rootNode->children()->count() : 0;

        $weeklyRecruits = \App\Models\Distributor::where('upline_id', $distributorId)
            ->where('created_at', '>=', now()->subDays(7))->count();
        $weeklyEarnings = \App\Models\Payment::where('distributor_id', $distributorId)
            ->where('status', 'success')
            ->where('created_at', '>=', now()->subDays(7))
            ->sum('commission_amount');

        return response()->json([
            'ok' => true,
            'distributor_id' => $distributorId,
            'rank' => $currentRank,
            'own_points' => $ownPoints,
            'total_points' => $totalPoints,
            'direct_count' => $directCount,
            'weekly_recruits' => $weeklyRecruits,
            'weekly_earnings' => $weeklyEarnings,
            'wallet_balance' => $wallet?->balance ?? 0,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'file'  => $e->getFile(),
            'line'  => $e->getLine(),
            'trace' => collect(explode("\n", $e->getTraceAsString()))->take(8)->toArray(),
        ], 500);
    }
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Goals ─────────────────────────────────────────────────────────────────────
// Engine route uses a distinct top-level path to avoid {id} wildcard collision
Route::middleware('auth:sanctum,api')->get('/goal-engine', [GoalController::class, 'engine']);

Route::middleware('auth:sanctum,api')->group(function () {
    Route::get('/goals', [GoalController::class, 'index']);
    Route::post('/goals', [GoalController::class, 'store']);
    Route::get('/goals/{id}', [GoalController::class, 'show']);
    Route::put('/goals/{id}', [GoalController::class, 'update']);
    Route::delete('/goals/{id}', [GoalController::class, 'destroy']);
    Route::get('/goals/{id}/activities', [GoalController::class, 'activities']);
    Route::post('/goals/{id}/activities', [GoalController::class, 'storeActivity']);
    Route::post('/goals/{id}/milestones', [GoalController::class, 'storeMilestone']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Owner Presentation Upload ─────────────────────────────────────────────────
use App\Http\Controllers\Api\OwnerPresentationController;
// Owner-only routes (protected by auth:sanctum — owner role checked in controller)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/owner/presentations',        [OwnerPresentationController::class, 'index']);
    Route::post('/owner/presentations',       [OwnerPresentationController::class, 'store']);
    Route::put('/owner/presentations/{id}',   [OwnerPresentationController::class, 'update']);
    Route::delete('/owner/presentations/{id}',[OwnerPresentationController::class, 'destroy']);
});
// Distributor library — all global presentations
Route::middleware('auth:sanctum,api')->get('/presentations/library', [OwnerPresentationController::class, 'library']);
// ─────────────────────────────────────────────────────────────────────────────
use App\Http\Controllers\Api\PerformanceController;

// Public tracked links (no auth)
Route::get('/p/{token}',      [PerformanceController::class, 'publicPresentationPage']);
Route::get('/invite/{token}', [PerformanceController::class, 'publicInvitePage']);
Route::post('/p/{token}/track',      [PerformanceController::class, 'trackPresentation']);
Route::post('/invite/{token}/track', [PerformanceController::class, 'trackInvitation']);
Route::post('/p/{token}/lead',       [PerformanceController::class, 'capturePublicLead']);
Route::post('/invite/{token}/lead',  [PerformanceController::class, 'capturePublicLead']);

Route::middleware('auth:sanctum,api')->group(function () {
    // Presentations
    Route::get('/presentations',           [PerformanceController::class, 'listPresentations']);
    Route::post('/presentations',          [PerformanceController::class, 'storePresentation']);
    Route::put('/presentations/{id}',      [PerformanceController::class, 'updatePresentation']);
    Route::delete('/presentations/{id}',   [PerformanceController::class, 'deletePresentation']);
    Route::post('/presentations/assign',   [PerformanceController::class, 'assignPresentation']);
    Route::post('/presentations/call-outcome', [PerformanceController::class, 'logPresentationCallOutcome']);
    Route::get('/prospects/{id}/assignments', [PerformanceController::class, 'listAssignments']);
    // Invitations
    Route::post('/invitations',                    [PerformanceController::class, 'createInvitation']);
    Route::get('/prospects/{id}/invitations',      [PerformanceController::class, 'listInvitations']);
    Route::patch('/invitations/{id}/status',       [PerformanceController::class, 'updateInvitationStatus']);
    // Automation
    Route::get('/automation-rules',          [PerformanceController::class, 'listAutomationRules']);
    Route::post('/automation-rules',         [PerformanceController::class, 'storeAutomationRule']);
    Route::patch('/automation-rules/{id}/toggle', [PerformanceController::class, 'toggleAutomationRule']);
    // Priority
    Route::get('/prospect-priority',         [PerformanceController::class, 'priorityLeads']);
    // Daily dashboard
    Route::get('/daily-dashboard',           [PerformanceController::class, 'dailyDashboard']);
    Route::post('/daily-dashboard/complete', [PerformanceController::class, 'completeTask']);
    // Behavioral intelligence
    Route::get('/recommendations/active',              [PerformanceController::class, 'activeRecommendations']);
    Route::get('/prospects/{id}/recommendations',      [PerformanceController::class, 'prospectRecommendations']);
    Route::patch('/recommendations/{id}/read',         [PerformanceController::class, 'markRecommendationRead']);
    // Onboarding
    Route::get('/onboarding/status',         [PerformanceController::class, 'onboardingStatus']);
    // Playbooks & duplication
    Route::get('/playbooks',                 [PerformanceController::class, 'listPlaybooks']);
    Route::post('/playbooks',                [PerformanceController::class, 'storePlaybook']);
    Route::get('/scripts',                   [PerformanceController::class, 'getScript']);
    Route::get('/duplication/weekly-goals',  [PerformanceController::class, 'weeklyGoals']);
    // Funnel analytics
    Route::get('/funnel/report',             [PerformanceController::class, 'funnelReport']);
});
// ─────────────────────────────────────────────────────────────────────────────
use App\Http\Controllers\Api\PaymentController;

// Public payment routes (used by independent CustomerPayScreen and Chapa webhooks)
Route::post('/payments/initiate', [PaymentController::class, 'initiate']);
Route::post('/payments/webhook', [PaymentController::class, 'webhook']);
Route::post('/payments/stay-as-customer', [PaymentController::class, 'stayAsCustomer']);
Route::get('/payments/verify/{txRef}', [PaymentController::class, 'verify']);
Route::get('/payments/return', [PaymentController::class, 'returnUrl']);

// Auth is handled manually inside the controller to support both owner and distributor tokens
Route::get('/payments', [PaymentController::class, 'index']);

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── Tree ──────────────────────────────────────────────────────────────────────
use App\Http\Controllers\Api\TreeController;
Route::middleware('auth:sanctum,api')->group(function () {
    Route::get('/tree', [TreeController::class, 'myTree']);
    Route::get('/tree/{nodeId}', [TreeController::class, 'getSubtree']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Wallet & MLM Stats ────────────────────────────────────────────────────────
use App\Http\Controllers\Api\WalletController;
Route::middleware('auth:sanctum,api')->group(function () {
    Route::get('/wallet', [WalletController::class, 'show']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Distributor Join (MLM Network Enrollment) ─────────────────────────────────
use App\Http\Controllers\Api\DistributorJoinController;
Route::middleware('auth:sanctum,api')->group(function () {
    Route::post('/distributor/join', [DistributorJoinController::class, 'join']);
    Route::get('/distributor/status', [DistributorJoinController::class, 'status']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Account Product Upgrade ───────────────────────────────────────────────────
use App\Http\Controllers\Api\AccountUpgradeController;
Route::middleware('auth:sanctum,api')->group(function () {
    Route::get('/account/upgrade/options',    [AccountUpgradeController::class, 'options']);
    Route::post('/account/upgrade/initiate',  [AccountUpgradeController::class, 'initiate']);
    Route::post('/account/upgrade/complete',  [AccountUpgradeController::class, 'complete']);
});
// ─────────────────────────────────────────────────────────────────────────────
Route::post('/customer/upgrade', [CustomerUpgradeController::class, 'upgrade']);
Route::get('/customer/status',   [CustomerUpgradeController::class, 'status']);
// ─────────────────────────────────────────────────────────────────────────────


// ── Temporary diagnostic routes – REMOVE AFTER USE ───────────────────────────

// Automatically creates missing Account records for legacy tree data
Route::get('/fix-accounts', function () {
    $nodes = \App\Models\Node::all();
    $fixed = 0;

    foreach ($nodes as $node) {
        $hasAccount = \App\Models\Account::where('distributor_id', $node->distributor_id)->exists();

        if (!$hasAccount) {
            $payment = \App\Models\Payment::where('distributor_id', $node->distributor_id)
                ->whereNotNull('product_id')
                ->first();

            $productId = $payment ? $payment->product_id : null;
            if (!$productId) {
                $golden = \App\Models\Product::where('category', 'golden')->first();
                $productId = $golden ? $golden->id : 3; // default to 3 if unknown
            }

            $sponsorId = null;
            if ($node->parent_id) {
                $parent = \App\Models\Node::find($node->parent_id);
                if ($parent) {
                    $sponsorId = $parent->distributor_id;
                }
            }

            \App\Models\Account::create([
                'distributor_id' => $node->distributor_id,
                'node_id' => $node->id,
                'product_id' => $productId,
                'sponsor_id' => $sponsorId,
            ]);

            $fixed++;
        }
    }

    return response()->json([
        'message' => "Successfully fixed and generated $fixed missing accounts for legacy tree data."
    ]);
});

// Temporary route to debug a distributor's rate
Route::get('/debug-rate/{distributorId}', function ($distributorId) {
    $distributor = \App\Models\Distributor::find($distributorId);
    if (!$distributor)
        return response()->json(['error' => 'Distributor not found']);

    $accounts = \App\Models\Account::where('distributor_id', $distributorId)->with('product')->get();

    $rate = 10;
    foreach ($accounts as $acc) {
        if ($acc->product && $acc->product->referral_rate > $rate) {
            $rate = $acc->product->referral_rate;
        }
    }

    return response()->json([
        'distributor_name' => $distributor->name,
        'accounts_count' => $accounts->count(),
        'accounts' => $accounts,
        'calculated_rate' => $rate,
    ]);
});

// Debug all rates
Route::get('/debug-all-rates', function () {
    $distributors = \App\Models\Distributor::limit(10)->get();
    $result = [];
    foreach ($distributors as $distributor) {
        $accounts = \App\Models\Account::where('distributor_id', $distributor->distributor_id)->with('product')->get();
        $rate = 10;
        foreach ($accounts as $acc) {
            if ($acc->product && $acc->product->referral_rate > $rate) {
                $rate = $acc->product->referral_rate;
            }
        }
        $result[] = [
            'id' => $distributor->distributor_id,
            'name' => $distributor->name,
            'accounts' => $accounts->count(),
            'rate' => $rate . '%'
        ];
    }
    return response()->json($result);
});

// Shows all tables + previously-run migrations
Route::get('/db-status', function () {
    try {
        $tables = \Illuminate\Support\Facades\DB::select(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        $migrations = [];
        try {
            $migrations = \Illuminate\Support\Facades\DB::select('SELECT * FROM migrations ORDER BY id');
        } catch (\Exception $e) {
            $migrations = ['error' => $e->getMessage()];
        }
        return response()->json([
            'status' => 'ok',
            'tables' => array_column($tables, 'table_name'),
            'migrations' => $migrations,
        ]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// Drops all tables and re-runs all migrations (USE ONLY ONCE TO FIX BROKEN STATE)
Route::get('/migrate-fresh', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--force' => true, '--seed' => true]);
        return response()->json([
            'status' => 'success',
            'message' => 'Fresh migration completed',
            'output' => \Illuminate\Support\Facades\Artisan::output(),
        ]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// Runs pending migrations only
Route::get('/migrate', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return response()->json([
            'status' => 'success',
            'message' => 'Migrations completed',
            'output' => \Illuminate\Support\Facades\Artisan::output(),
        ]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// Temporary route to create the owner account on the production database
Route::get('/create-owner', function () {
    $user = \App\Models\User::updateOrCreate(
        ['email' => 'miki@gmail.com'],
        [
            'name' => 'Mikiyas',
            'password' => \Illuminate\Support\Facades\Hash::make('mikiyas'),
            'role' => 'owner',
            'status' => 'active'
        ]
    );
    return response()->json(['message' => 'Owner created successfully on production database!', 'user' => $user]);
});

// Temporary route to remove duplicate distributor user from production database
Route::get('/remove-duplicate-distributor', function () {
    $deleted = \Illuminate\Support\Facades\DB::table('distributors')
        ->where('email', 'miki@gmail.com')
        ->delete();

    if ($deleted) {
        return response()->json([
            'message' => 'Successfully removed distributor user with email miki@gmail.com from production database!',
            'deleted_count' => $deleted
        ]);
    } else {
        return response()->json([
            'message' => 'No distributor user found with email miki@gmail.com',
            'deleted_count' => 0
        ]);
    }
});

// Full flow simulation: reset → double account → refer customer → show result
Route::get('/test-full-flow/{email}', function ($email) {
    $dist = \App\Models\Distributor::where('email', $email)->first();
    if (!$dist)
        return response()->json(['error' => 'Distributor not found'], 404);

    $distId = $dist->distributor_id;
    $product = \App\Models\Product::first();
    if (!$product)
        return response()->json(['error' => 'No products in DB'], 404);

    $mlm = app(\App\Services\MlmEngineService::class);
    $log = [];

    // Step 1: Reset (remove everything except main node)
    $mainNode = \App\Models\Node::where('distributor_id', $distId)->orderBy('id', 'asc')->first();
    if ($mainNode) {
        $children = \App\Models\Node::where('parent_id', $mainNode->id)->get();
        foreach ($children as $c) {
            \App\Models\Account::where('node_id', $c->id)->delete();
            $c->delete();
        }
        $others = \App\Models\Node::where('distributor_id', $distId)->where('id', '!=', $mainNode->id)->get();
        foreach ($others as $o) {
            \App\Models\Account::where('node_id', $o->id)->delete();
            $o->delete();
        }
        $log[] = 'Reset done. Main node id: ' . $mainNode->id;
    } else {
        $log[] = 'No main node — will create fresh';
    }

    // Step 2: Simulate distributor buying a 2nd account (doubling)
    try {
        $secondAccount = $mlm->processPurchase($distId, $product->id);
        $log[] = 'Doubled account created. Account id: ' . $secondAccount->id . ', Node id: ' . $secondAccount->node_id;
    } catch (\Exception $e) {
        $log[] = 'Double failed: ' . $e->getMessage();
    }

    // Step 3: Simulate a customer referral purchase
    $uniqueCustEmail = 'testcustomer_' . uniqid() . '@example.com';
    try {
        $custAccount = $mlm->processCustomerPurchase(
            $distId,
            $product->id,
            'Test Customer',
            $uniqueCustEmail,
            '0900000000'
        );
        $log[] = 'Customer node created. Account id: ' . $custAccount->id . ', Node id: ' . $custAccount->node_id;
    } catch (\Exception $e) {
        $log[] = 'Customer placement failed: ' . $e->getMessage();
    }

    // Step 4: Dump the current node structure
    $custDistributor = \App\Models\Distributor::where('email', $uniqueCustEmail)->first();
    $custNode = $custDistributor
        ? \App\Models\Node::where('distributor_id', $custDistributor->distributor_id)
            ->orderBy('id', 'desc')
            ->first()
        : null;

    $mainNodeFresh = \App\Models\Node::where('distributor_id', $distId)->orderBy('id', 'asc')->first();
    $secondaryNodes = $mainNodeFresh ? \App\Models\Node::where('parent_id', $mainNodeFresh->id)->where('distributor_id', $distId)->get() : [];

    $custParentId = $custNode?->parent_id;
    $isUnderSecondary = collect($secondaryNodes)->contains('id', $custParentId);

    return response()->json([
        'log' => $log,
        'main_node' => $mainNodeFresh,
        'secondary_nodes' => $secondaryNodes,
        'customer_node' => $custNode,
        'customer_parent_id' => $custParentId,
        'is_under_secondary' => $isUnderSecondary,
        'verdict' => $isUnderSecondary ? '✅ PASS: Customer correctly placed under secondary account!' : '❌ FAIL: Customer NOT under secondary account',
    ]);
});

// Temporary: inspect node tree structure for a distributor
Route::get('/debug-tree/{email}', function ($email) {
    $dist = \App\Models\Distributor::where('email', $email)->first();
    if (!$dist)
        return response()->json(['error' => 'Distributor not found'], 404);

    $distId = $dist->distributor_id;
    $nodes = \App\Models\Node::where('distributor_id', $distId)->orderBy('id')->get();
    $accounts = \App\Models\Account::where('distributor_id', $distId)->get();

    $mainNode = $nodes->first();
    $secondaryNodes = $mainNode
        ? \App\Models\Node::where('parent_id', $mainNode->id)->where('distributor_id', $distId)->get()
        : [];

    return response()->json([
        'distributor_id' => $distId,
        'all_nodes' => $nodes,
        'accounts' => $accounts,
        'main_node' => $mainNode,
        'secondary_nodes_count' => collect($secondaryNodes)->count(),
        'secondary_nodes' => $secondaryNodes,
    ]);
});

// Temporary route to reset a specific distributor's tree (remove duplicates from testing)
Route::get('/reset-tree/{email}', function ($email) {
    $dist = \App\Models\Distributor::where('email', $email)->first();
    if (!$dist)
        return response()->json(['error' => 'Distributor not found'], 404);

    $distId = $dist->distributor_id;

    // Find my main node
    $mainNode = \App\Models\Node::where('distributor_id', $distId)->orderBy('id', 'asc')->first();

    if (!$mainNode)
        return response()->json(['message' => 'No main node found']);

    // Delete all nodes where parent_id = my main node's id
    $childNodes = \App\Models\Node::where('parent_id', $mainNode->id)->get();

    $deletedCount = 0;
    foreach ($childNodes as $child) {
        \App\Models\Account::where('node_id', $child->id)->delete();
        $child->delete();
        $deletedCount++;
    }

    // Also delete any other nodes I own except the main node
    $myOtherNodes = \App\Models\Node::where('distributor_id', $distId)->where('id', '!=', $mainNode->id)->get();
    foreach ($myOtherNodes as $other) {
        \App\Models\Account::where('node_id', $other->id)->delete();
        $other->delete();
        $deletedCount++;
    }

    // Reset their stats to 0 to fix left/right points that were messed up
    \App\Models\Stat::where('distributor_id', $distId)->update([
        'left_points' => 0,
        'right_points' => 0,
        'carry_left' => 0,
        'carry_right' => 0
    ]);

    return response()->json(['message' => "Successfully deleted $deletedCount extra accounts/nodes for $email. The tree is clean!"]);
});

// ─────────────────────────────────────────────────────────────────────────────

// Fix duplicate/misplaced secondary nodes for a distributor
// Moves all secondary nodes to be proper children of the main node
Route::get('/fix-doubling/{email}', function ($email) {
    $dist = \App\Models\Distributor::where('email', $email)->first();
    if (!$dist) return response()->json(['error' => 'Not found'], 404);

    $distId   = $dist->distributor_id;
    $allNodes = \App\Models\Node::where('distributor_id', $distId)->orderBy('id')->get();

    if ($allNodes->count() < 2) {
        return response()->json(['message' => 'Nothing to fix — only one node']);
    }

    $mainNode = $allNodes->first();
    $fixed    = [];

    foreach ($allNodes->skip(1) as $secondary) {
        // If this secondary node is NOT a child of the main node, move it there
        if ($secondary->parent_id !== $mainNode->id) {
            $usedLegs = \App\Models\Node::where('parent_id', $mainNode->id)
                ->where('id', '!=', $secondary->id)
                ->pluck('leg')->toArray();
            $nextLeg = 1;
            while (in_array($nextLeg, $usedLegs) && $nextLeg <= 4) $nextLeg++;
            if ($nextLeg > 4) {
                $fixed[] = "Node {$secondary->id}: no free leg under main node";
                continue;
            }
            $secondary->parent_id = $mainNode->id;
            $secondary->leg       = $nextLeg;
            $secondary->save();
            $fixed[] = "Node {$secondary->id}: moved to parent={$mainNode->id} leg={$nextLeg}";
        } else {
            $fixed[] = "Node {$secondary->id}: already correct (parent={$secondary->parent_id} leg={$secondary->leg})";
        }
    }

    // Recalculate own_points
    $mlm = new \App\Services\MlmEngineService();
    $stat = \App\Models\Stat::firstOrCreate(['distributor_id' => $distId]);
    $pts = \App\Models\Account::where('distributor_id', $distId)->with('product')->get()->sum(fn($a) => $a->product->point ?? 0);
    $stat->own_points = $pts;
    $stat->save();

    return response()->json(['fixed' => $fixed, 'own_points' => $pts]);
});

// Full end-to-end upgrade flow test (creates payment + runs upgrade + verifies tree)
Route::post('/test-upgrade-flow', function (\Illuminate\Http\Request $request) {
    $custEmail   = $request->input('email');
    $txRef       = $request->input('tx_ref');
    $distributorId = (int) $request->input('distributor_id');
    $productId   = (int) $request->input('product_id', 1);
    $amount      = (float) $request->input('amount', 7690);
    $leg         = (int) $request->input('leg', 2);
    $password    = $request->input('password', 'testpass123');

    if (!$custEmail || !$txRef || !$distributorId) {
        return response()->json(['error' => 'Missing required fields'], 422);
    }

    // Step 1: Create a pending payment record (bypasses Chapa)
    $payment = \App\Models\Payment::create([
        'product_id'        => $productId,
        'distributor_id'    => $distributorId,
        'customer_name'     => 'Flow Test Customer',
        'customer_email'    => $custEmail,
        'customer_phone'    => '0944444444',
        'tx_ref'            => $txRef,
        'amount'            => $amount,
        'currency'          => 'ETB',
        'quantity'          => 1,
        'commission_amount' => round($amount * 0.16, 2),
        'status'            => 'pending',
        'commission_paid'   => false,
        'webhook_verified'  => false,
        'leg'               => $leg,
    ]);

    // Step 2: Run the upgrade (same logic as CustomerUpgradeController)
    \Illuminate\Support\Facades\DB::beginTransaction();
    try {
        $p = \App\Models\Payment::where('tx_ref', $txRef)->lockForUpdate()->first();

        $dist = \App\Models\Distributor::create([
            'name'      => $p->customer_name,
            'email'     => $custEmail,
            'phone'     => $p->customer_phone,
            'password'  => \Illuminate\Support\Facades\Hash::make($password),
            'upline_id' => $p->distributor_id,
            'is_paid'   => true,
            'status'    => 'active',
            'join_date' => now()->toDateString(),
        ]);

        \App\Models\Wallet::firstOrCreate(['distributor_id' => $dist->distributor_id]);
        \App\Models\Stat::firstOrCreate(['distributor_id'   => $dist->distributor_id]);

        $sponsorNode = \App\Models\Node::where('distributor_id', $p->distributor_id)->orderBy('id')->first();
        $nodeCreated = null;
        if ($sponsorNode) {
            $mlm          = new \App\Services\MlmEngineService();
            $preferredLeg = $p->leg ?? null;
            $placementNode = null;
            $legNum        = null;

            if ($preferredLeg) {
                $existingLegChild = \App\Models\Node::where('parent_id', $sponsorNode->id)
                    ->where('leg', $preferredLeg)->first();
                if ($existingLegChild) {
                    $placementNode = $mlm->findPlacementNode($existingLegChild->id);
                    $legNum        = $placementNode ? min($placementNode->children()->count() + 1, 4) : 1;
                } else {
                    $placementNode = $sponsorNode;
                    $legNum        = $preferredLeg;
                }
            } else {
                $placementNode = $mlm->findPlacementNode($sponsorNode->id);
                $legNum        = $placementNode ? min($placementNode->children()->count() + 1, 4) : 1;
            }

            if ($placementNode) {
                $newNode = \App\Models\Node::create([
                    'parent_id'      => $placementNode->id,
                    'distributor_id' => $dist->distributor_id,
                    'leg'            => $legNum,
                ]);
                \App\Models\Account::create([
                    'distributor_id' => $dist->distributor_id,
                    'node_id'        => $newNode->id,
                    'product_id'     => $p->product_id,
                    'sponsor_id'     => $p->distributor_id,
                ]);
                $nodeCreated = ['node_id' => $newNode->id, 'parent_id' => $newNode->parent_id, 'leg' => $newNode->leg];
                $mlm->runRankCheckForAncestors($newNode, $dist->distributor_id);
            }
        }

        \Illuminate\Support\Facades\DB::table('payments')->where('id', $p->id)->update([
            'status' => 'success', 'commission_paid' => true, 'updated_at' => now(),
        ]);

        \Illuminate\Support\Facades\DB::commit();

        $token = $dist->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'           => 'success',
            'distributor_id'   => $dist->distributor_id,
            'email'            => $dist->email,
            'dist_status'      => $dist->status,
            'is_paid'          => $dist->is_paid,
            'node_created'     => $nodeCreated,
            'access_token'     => $token,
        ]);
    } catch (\Throwable $e) {
        \Illuminate\Support\Facades\DB::rollBack();
        \App\Models\Payment::where('tx_ref', $txRef)->delete();
        return response()->json(['error' => $e->getMessage(), 'file' => $e->getFile().':'.$e->getLine()], 500);
    }
});

// Cleanup test distributor by email
Route::delete('/test-cleanup/{email}', function ($email) {
    $dist = \App\Models\Distributor::where('email', $email)->first();
    if (!$dist) return response()->json(['message' => 'Not found']);
    $did = $dist->distributor_id;
    \App\Models\Account::where('distributor_id', $did)->delete();
    $nids = \App\Models\Node::where('distributor_id', $did)->pluck('id');
    \App\Models\Node::whereIn('id', $nids)->delete();
    \App\Models\Stat::where('distributor_id', $did)->delete();
    \App\Models\Wallet::where('distributor_id', $did)->delete();
    $dist->delete();
    return response()->json(['message' => "Deleted distributor $email"]);
});

// Fix is_paid for all distributors who have accounts but is_paid=false
Route::get('/fix-is-paid', function () {
    $fixed = 0;
    $dists = \App\Models\Distributor::where('is_paid', false)->get();
    foreach ($dists as $d) {
        $hasAccount = \App\Models\Account::where('distributor_id', $d->distributor_id)->exists();
        if ($hasAccount) {
            \Illuminate\Support\Facades\DB::table('distributors')
                ->where('distributor_id', $d->distributor_id)
                ->update(['is_paid' => true, 'updated_at' => now()]);
            $fixed++;
        }
    }
    return response()->json(['fixed' => $fixed, 'message' => "Set is_paid=true for $fixed distributors who have accounts"]);
});

// Diagnostic: test processPurchase directly and return the real error
Route::get('/test-join/{email}', function ($email) {
    $dist = \App\Models\Distributor::where('email', $email)->first();
    if (!$dist) return response()->json(['error' => 'Not found'], 404);

    $product = \App\Models\Product::find(1);
    if (!$product) return response()->json(['error' => 'No product'], 404);

    $mlm = new \App\Services\MlmEngineService();
    try {
        $account = $mlm->processPurchase($dist->distributor_id, $product->id, null, 1);
        $node = \App\Models\Node::find($account->node_id);
        return response()->json([
            'status'   => 'success',
            'account'  => $account->id,
            'node_id'  => $node->id,
            'parent_id'=> $node->parent_id,
            'leg'      => $node->leg,
            'is_paid'  => \App\Models\Distributor::find($dist->distributor_id)->is_paid,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'error'   => $e->getMessage(),
            'file'    => $e->getFile() . ':' . $e->getLine(),
            'trace'   => collect(explode("\n", $e->getTraceAsString()))->take(8)->toArray(),
        ], 500);
    }
});

// Check for circular references in nodes table
Route::get('/check-tree-integrity', function () {
    $nodes = \App\Models\Node::all();
    $issues = [];
    foreach ($nodes as $node) {
        if ($node->parent_id === $node->id) {
            $issues[] = "Self-reference: node {$node->id}";
        }
        if ($node->parent_id) {
            $parent = \App\Models\Node::find($node->parent_id);
            if (!$parent) {
                $issues[] = "Orphan: node {$node->id} references missing parent {$node->parent_id}";
            }
        }
    }
    // Check for cycles using DFS
    $nodeMap = $nodes->keyBy('id');
    $cycles = [];
    foreach ($nodes as $startNode) {
        $visited = [];
        $current = $startNode;
        $path = [];
        while ($current && $current->parent_id) {
            if (in_array($current->id, $visited)) {
                $cycles[] = "Cycle detected involving node {$current->id}, path: " . implode('->', $path);
                break;
            }
            $visited[] = $current->id;
            $path[] = $current->id;
            $current = $nodeMap->get($current->parent_id);
            if (count($path) > 100) { $cycles[] = "Deep chain from node {$startNode->id}"; break; }
        }
    }
    return response()->json([
        'total_nodes' => $nodes->count(),
        'issues'      => $issues,
        'cycles'      => array_unique($cycles),
        'root_nodes'  => $nodes->whereNull('parent_id')->pluck('id'),
    ]);
});

// Insert a pending payment record only (for testing stay-as-customer)
Route::post('/insert-test-payment', function (\Illuminate\Http\Request $request) {
    $payment = \App\Models\Payment::create([
        'product_id'        => $request->input('product_id', 1),
        'distributor_id'    => $request->input('distributor_id'),
        'customer_name'     => $request->input('customer_name', 'Test Customer'),
        'customer_email'    => $request->input('customer_email'),
        'customer_phone'    => $request->input('customer_phone', '0911111111'),
        'tx_ref'            => $request->input('tx_ref'),
        'amount'            => $request->input('amount', 7690),
        'currency'          => 'ETB',
        'quantity'          => 1,
        'commission_amount' => round($request->input('amount', 7690) * 0.16, 2),
        'status'            => 'pending',
        'commission_paid'   => false,
        'webhook_verified'  => false,
        'leg'               => $request->input('leg', null),
    ]);
    return response()->json(['payment_id' => $payment->id, 'tx_ref' => $payment->tx_ref]);
});

// Backfill node ranks for all distributors (run once after adding nodes.rank column)
Route::get('/backfill-node-ranks', function () {
    $mlm = new \App\Services\MlmEngineService();
    $distributors = \App\Models\Distributor::whereHas('nodes')->get();
    $updated = 0;
    foreach ($distributors as $dist) {
        try {
            $mlm->runRankCheck($dist->distributor_id);
            $updated++;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('backfill-node-ranks error for ' . $dist->email . ': ' . $e->getMessage());
        }
    }
    return response()->json(['message' => "Backfilled ranks for $updated distributors"]);
});

// Run rank check for a single distributor by id (for backfilling)
Route::get('/run-rank-check/{distributorId}', function ($distributorId) {
    $mlm = new \App\Services\MlmEngineService();
    try {
        $mlm->runRankCheck((int)$distributorId);
        $nodes = \App\Models\Node::where('distributor_id', $distributorId)->orderBy('id')->get(['id', 'rank', 'leg', 'parent_id']);
        return response()->json(['status' => 'ok', 'distributor_id' => $distributorId, 'nodes' => $nodes]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// Check payment details by tx_ref (for debugging return_url)
Route::get('/check-payment/{txRef}', function ($txRef) {
    $p = \App\Models\Payment::where('tx_ref', $txRef)->first();
    if (!$p) return response()->json(['error' => 'Not found'], 404);
    return response()->json([
        'tx_ref'         => $p->tx_ref,
        'status'         => $p->status,
        'customer_email' => $p->customer_email,
        'customer_name'  => $p->customer_name,
        'amount'         => $p->amount,
        'product_id'     => $p->product_id,
        'distributor_id' => $p->distributor_id,
        'leg'            => $p->leg,
        'commission_paid'=> $p->commission_paid,
    ]);
});

// Check distributor status by email (for debugging)
Route::get('/check-distributor/{email}', function ($email) {
    $d = \App\Models\Distributor::where('email', $email)->first();
    if (!$d) return response()->json(['error' => 'Not found'], 404);
    $hasAccount = \App\Models\Account::where('distributor_id', $d->distributor_id)->exists();
    return response()->json([
        'distributor_id' => $d->distributor_id,
        'name'           => $d->name,
        'email'          => $d->email,
        'status'         => $d->status,
        'is_paid'        => $d->is_paid,
        'rank'           => $d->rank,
        'has_account'    => $hasAccount,
        'upline_id'      => $d->upline_id,
    ]);
});

// Test account upgrade complete directly
Route::post('/test-upgrade-complete', function (\Illuminate\Http\Request $request) {
    try {
        $txRef = $request->input('tx_ref');
        $nodeId = $request->input('node_id');
        $newProductId = $request->input('new_product_id');

        $account = \App\Models\Account::with(['product', 'distributor'])->where('node_id', $nodeId)->first();
        if (!$account) return response()->json(['error' => 'Account not found for node ' . $nodeId], 404);

        $newProduct = \App\Models\Product::find($newProductId);
        if (!$newProduct) return response()->json(['error' => 'Product not found'], 404);

        $currentPoints = $account->product->point ?? 0;
        if ($newProduct->point <= $currentPoints) {
            return response()->json(['error' => 'New product must have more points. Current: ' . $currentPoints . ', New: ' . $newProduct->point], 422);
        }

        \Illuminate\Support\Facades\DB::table('accounts')
            ->where('id', $account->id)
            ->update(['product_id' => $newProduct->id, 'updated_at' => now()]);

        $mlm = new \App\Services\MlmEngineService();
        $mlm->recalcAndRankForDistributor($account->distributor_id);

        $account->refresh(); $account->load('product');

        return response()->json([
            'status'       => 'success',
            'account_id'   => $account->id,
            'new_product'  => $newProduct->name,
            'new_category' => $newProduct->category,
            'new_points'   => $newProduct->point,
            'distributor_id' => $account->distributor_id,
        ]);
    } catch (\Throwable $e) {
        return response()->json(['error' => $e->getMessage(), 'file' => $e->getFile() . ':' . $e->getLine()], 500);
    }
});
