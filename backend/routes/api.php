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
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/profile/password', [AuthController::class, 'updatePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::get('/products', [\App\Http\Controllers\ProductController::class, 'index']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/products', [\App\Http\Controllers\ProductController::class, 'store']);
    Route::put('/products/{product}', [\App\Http\Controllers\ProductController::class, 'update']);
    Route::delete('/products/{product}', [\App\Http\Controllers\ProductController::class, 'destroy']);
});

// ── Contacts (Prospects / Followups / Closings) ───────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::post('/contacts', [ContactController::class, 'store']);
    Route::get('/contacts/followups', [ContactController::class, 'followups']);
    Route::get('/contacts/closings', [ContactController::class, 'closings']);
    Route::get('/contacts/{id}', [ContactController::class, 'show']);
    Route::put('/contacts/{id}', [ContactController::class, 'update']);
    Route::delete('/contacts/{id}', [ContactController::class, 'destroy']);
    Route::post('/contacts/{id}/followups', [ContactController::class, 'storeFollowup']);
    Route::post('/contacts/{id}/closings', [ContactController::class, 'storeClosing']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Goals ─────────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
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

// ── Payments (Chapa) ──────────────────────────────────────────────────────────
use App\Http\Controllers\Api\PaymentController;

// Public payment routes (used by independent CustomerPayScreen and Chapa webhooks)
Route::post('/payments/initiate', [PaymentController::class, 'initiate']);
Route::post('/payments/webhook', [PaymentController::class, 'webhook']);
Route::get('/payments/verify/{txRef}', [PaymentController::class, 'verify']);
Route::get('/payments/return', [PaymentController::class, 'returnUrl']);

// Protected routes (for distributors to view their sales/commissions)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/payments', [PaymentController::class, 'index']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Tree ──────────────────────────────────────────────────────────────────────
use App\Http\Controllers\Api\TreeController;
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/tree', [TreeController::class, 'myTree']);
    Route::get('/tree/{nodeId}', [TreeController::class, 'getSubtree']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Wallet & MLM Stats ────────────────────────────────────────────────────────
use App\Http\Controllers\Api\WalletController;
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/wallet', [WalletController::class, 'show']);
    Route::post('/wallet/run-cycle', [WalletController::class, 'runCycle']);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Distributor Join (MLM Network Enrollment) ─────────────────────────────────
use App\Http\Controllers\Api\DistributorJoinController;
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/distributor/join',   [DistributorJoinController::class, 'join']);
    Route::get('/distributor/status',  [DistributorJoinController::class, 'status']);
});
// ─────────────────────────────────────────────────────────────────────────────


// ── Temporary diagnostic routes – REMOVE AFTER USE ───────────────────────────

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
    if (!$dist) return response()->json(['error' => 'Distributor not found'], 404);

    $distId  = $dist->distributor_id;
    $product = \App\Models\Product::first();
    if (!$product) return response()->json(['error' => 'No products in DB'], 404);

    $mlm = app(\App\Services\MlmEngineService::class);
    $log = [];

    // Step 1: Reset (remove everything except main node)
    $mainNode = \App\Models\Node::where('distributor_id', $distId)->orderBy('id','asc')->first();
    if ($mainNode) {
        $children = \App\Models\Node::where('parent_id', $mainNode->id)->get();
        foreach ($children as $c) {
            \App\Models\Account::where('node_id', $c->id)->delete();
            $c->delete();
        }
        $others = \App\Models\Node::where('distributor_id', $distId)->where('id','!=',$mainNode->id)->get();
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
    try {
        $custAccount = $mlm->processCustomerPurchase(
            $distId,
            $product->id,
            'Test Customer',
            'testcustomer_sim@example.com',
            '0900000000'
        );
        $log[] = 'Customer node created. Account id: ' . $custAccount->id . ', Node id: ' . $custAccount->node_id;
    } catch (\Exception $e) {
        $log[] = 'Customer placement failed: ' . $e->getMessage();
    }

    // Step 4: Dump the current node structure
    $allNodes = \App\Models\Node::where('distributor_id', $distId)->with('children')->orderBy('id')->get();
    $custNode = \App\Models\Node::where('distributor_id', function($q) {
        $q->select('distributor_id')->from('distributors')->where('email','testcustomer_sim@example.com');
    })->first();

    $mainNodeFresh  = \App\Models\Node::where('distributor_id', $distId)->orderBy('id','asc')->first();
    $secondaryNodes = $mainNodeFresh ? \App\Models\Node::where('parent_id', $mainNodeFresh->id)->where('distributor_id', $distId)->get() : [];

    $custParentId = $custNode?->parent_id;
    $isUnderSecondary = collect($secondaryNodes)->contains('id', $custParentId);

    return response()->json([
        'log'                   => $log,
        'main_node'             => $mainNodeFresh,
        'secondary_nodes'       => $secondaryNodes,
        'customer_node'         => $custNode,
        'customer_parent_id'    => $custParentId,
        'is_under_secondary'    => $isUnderSecondary,
        'verdict'               => $isUnderSecondary ? '✅ PASS: Customer correctly placed under secondary account!' : '❌ FAIL: Customer NOT under secondary account',
    ]);
});

// Temporary: inspect node tree structure for a distributor
Route::get('/debug-tree/{email}', function ($email) {
    $dist = \App\Models\Distributor::where('email', $email)->first();
    if (!$dist) return response()->json(['error' => 'Distributor not found'], 404);

    $distId = $dist->distributor_id;
    $nodes = \App\Models\Node::where('distributor_id', $distId)->orderBy('id')->get();
    $accounts = \App\Models\Account::where('distributor_id', $distId)->get();

    $mainNode = $nodes->first();
    $secondaryNodes = $mainNode
        ? \App\Models\Node::where('parent_id', $mainNode->id)->where('distributor_id', $distId)->get()
        : [];

    return response()->json([
        'distributor_id' => $distId,
        'all_nodes'      => $nodes,
        'accounts'       => $accounts,
        'main_node'      => $mainNode,
        'secondary_nodes_count' => collect($secondaryNodes)->count(),
        'secondary_nodes'       => $secondaryNodes,
    ]);
});

// Temporary route to reset a specific distributor's tree (remove duplicates from testing)
Route::get('/reset-tree/{email}', function ($email) {
    $dist = \App\Models\Distributor::where('email', $email)->first();
    if (!$dist) return response()->json(['error' => 'Distributor not found'], 404);
    
    $distId = $dist->distributor_id;
    
    // Find my main node
    $mainNode = \App\Models\Node::where('distributor_id', $distId)->orderBy('id', 'asc')->first();
    
    if (!$mainNode) return response()->json(['message' => 'No main node found']);
    
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
    
    return response()->json(['message' => "Successfully deleted $deletedCount extra accounts/nodes for $email. The tree is clean!"]);
});

// ─────────────────────────────────────────────────────────────────────────────
