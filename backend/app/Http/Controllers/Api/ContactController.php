<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Prospect;
use App\Models\Followup;
use App\Models\ClosingAttempt;
use Illuminate\Support\Facades\Auth;

class ContactController extends Controller
{
    // ── Prospects ────────────────────────────────────────────────────

    /** GET /api/contacts — list all prospects belonging to the authenticated user */
    public function index()
    {
        $prospects = Prospect::where('user_id', Auth::id())
            ->withCount(['followups', 'closingAttempts'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $prospects]);
    }

    /** POST /api/contacts — create a new prospect */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'phone'        => 'required|string|max:50',
            'email'        => 'nullable|email|max:255',
            'source'       => 'nullable|string|max:50',
            'status'       => 'nullable|string|max:50',
            'relationship' => 'nullable|string|max:50',
        ]);

        $data['user_id'] = Auth::id();
        $data['status']  = $data['status'] ?? 'New';

        $prospect = Prospect::create($data);

        return response()->json(['status' => 'success', 'data' => $prospect], 201);
    }

    /** GET /api/contacts/{id} — single prospect with followups + closings */
    public function show($id)
    {
        $prospect = Prospect::where('prospect_id', $id)
            ->where('user_id', Auth::id())
            ->with(['followups', 'closingAttempts'])
            ->firstOrFail();

        return response()->json(['status' => 'success', 'data' => $prospect]);
    }

    /** PUT /api/contacts/{id} — update a prospect */
    public function update(Request $request, $id)
    {
        $prospect = Prospect::where('prospect_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $data = $request->validate([
            'name'         => 'sometimes|required|string|max:255',
            'phone'        => 'sometimes|required|string|max:50',
            'email'        => 'nullable|email|max:255',
            'source'       => 'nullable|string|max:50',
            'status'       => 'nullable|string|max:50',
            'relationship' => 'nullable|string|max:50',
        ]);

        $prospect->update($data);

        return response()->json(['status' => 'success', 'data' => $prospect]);
    }

    /** DELETE /api/contacts/{id} */
    public function destroy($id)
    {
        $prospect = Prospect::where('prospect_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $prospect->delete();

        return response()->json(['status' => 'success', 'message' => 'Contact deleted']);
    }

    // ── Follow-ups ───────────────────────────────────────────────────

    /** GET /api/contacts/followups — all followups for the authenticated user */
    public function followups()
    {
        $followups = Followup::where('user_id', Auth::id())
            ->with('prospect:prospect_id,name,phone')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $followups]);
    }

    /** POST /api/contacts/{id}/followups — add a followup to a prospect */
    public function storeFollowup(Request $request, $id)
    {
        // Ensure the prospect belongs to the user
        $prospect = Prospect::where('prospect_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $data = $request->validate([
            'followup_type' => 'nullable|string|max:50',
            'method'        => 'nullable|string|max:50',
            'script_used'   => 'nullable|string',
            'outcome'       => 'nullable|string|max:50',
            'notes'         => 'nullable|string',
        ]);

        $data['prospect_id'] = $prospect->prospect_id;
        $data['user_id']     = Auth::id();

        $followup = Followup::create($data);

        return response()->json(['status' => 'success', 'data' => $followup], 201);
    }

    // ── Closing Attempts ─────────────────────────────────────────────

    /** GET /api/contacts/closings — all closing attempts for the authenticated user */
    public function closings()
    {
        $closings = ClosingAttempt::where('user_id', Auth::id())
            ->with('prospect:prospect_id,name,phone')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $closings]);
    }

    /** POST /api/contacts/{id}/closings — add a closing attempt to a prospect */
    public function storeClosing(Request $request, $id)
    {
        $prospect = Prospect::where('prospect_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $data = $request->validate([
            'closing_method' => 'nullable|string|max:50',
            'outcome'        => 'nullable|string|max:50',
            'notes'          => 'nullable|string',
        ]);

        $data['prospect_id'] = $prospect->prospect_id;
        $data['user_id']     = Auth::id();

        $closing = ClosingAttempt::create($data);

        return response()->json(['status' => 'success', 'data' => $closing], 201);
    }
}
