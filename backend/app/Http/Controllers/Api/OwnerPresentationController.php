<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\Presentation;

/**
 * Owner Presentation Controller
 * Handles upload of global presentations (PDF, video, compensation plan)
 * that are visible to ALL distributors in the library.
 */
class OwnerPresentationController extends Controller
{
    // GET /api/owner/presentations — list all global presentations
    public function index()
    {
        $items = Presentation::where('is_global', true)
            ->orderByDesc('created_at')
            ->get();
        return response()->json(['status' => 'success', 'data' => $items]);
    }

    // POST /api/owner/presentations — upload a new global presentation
    public function store(Request $request)
    {
        $data = $request->validate([
            'title'        => 'required|string|max:255',
            'content_type' => 'required|in:video,pdf,compensation_plan',
            'description'  => 'nullable|string',
            'external_url' => 'nullable|string|url',
            'file'         => 'nullable|file|max:204800', // 200MB max
            // Compensation plan structured fields
            'comp_ranks'         => 'nullable|string', // JSON string of rank tiers
            'comp_commissions'   => 'nullable|string', // JSON string of commission rates
            'comp_bonuses'       => 'nullable|string', // JSON string of bonuses
            'comp_requirements'  => 'nullable|string', // JSON string of rank requirements
        ]);

        $fileUrl      = null;
        $thumbnailUrl = null;
        $fileSize     = null;
        $mimeType     = null;
        $totalPages   = null;
        $duration     = null;

        // Handle file upload
        if ($request->hasFile('file')) {
            $file     = $request->file('file');
            $mimeType = $file->getMimeType();
            $fileSize = $file->getSize();

            $cloudinaryUrl = env('CLOUDINARY_URL');
            if ($cloudinaryUrl) {
                // Use Cloudinary in production (Render ephemeral filesystem)
                try {
                    $cloudinary = new \Cloudinary\Cloudinary($cloudinaryUrl);
                    $result     = $cloudinary->uploadApi()->upload($file->getRealPath(), [
                        'folder'        => 'presentations',
                        'resource_type' => 'auto',
                    ]);
                    $fileUrl = $result['secure_url'] ?? null;
                } catch (\Throwable $ce) {
                    Log::error('Cloudinary presentation upload error: ' . $ce->getMessage());
                    throw new \Exception('File upload failed: ' . $ce->getMessage());
                }
            } else {
                // Local fallback for development
                $path    = $file->store('presentations', 'public');
                $fileUrl = Storage::url($path);
            }

            // For PDFs, estimate page count
            if (str_contains($mimeType, 'pdf')) {
                try {
                    $totalPages = max(1, (int)($fileSize / 50000));
                } catch (\Throwable $e) {}
            }
        } elseif (!empty($data['external_url'])) {
            $fileUrl = $data['external_url'];
        }

        // Parse compensation plan data
        $compPlanData = null;
        if ($data['content_type'] === 'compensation_plan') {
            $compPlanData = $this->parseCompPlanData($data);
        }

        // Global presentations have no distributor owner
        $presentation = Presentation::create([
            'distributor_id'     => null,
            'title'              => $data['title'],
            'content_type'       => $data['content_type'],
            'description'        => $data['description'] ?? null,
            'file_url'           => $fileUrl,
            'external_url'       => $data['external_url'] ?? null,
            'thumbnail_url'      => $thumbnailUrl,
            'total_pages'        => $totalPages,
            'duration_seconds'   => $duration,
            'is_active'          => true,
            'is_global'          => true,
            'uploaded_by_owner'  => true,
            'comp_plan_data'     => $compPlanData,
            'file_size'          => $fileSize,
            'mime_type'          => $mimeType,
        ]);

        return response()->json(['status' => 'success', 'data' => $presentation], 201);
    }

    // PUT /api/owner/presentations/{id}
    public function update(Request $request, $id)
    {
        $presentation = Presentation::where('id', $id)->where('is_global', true)->firstOrFail();
        $data = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'is_active'   => 'sometimes|boolean',
        ]);
        $presentation->update($data);
        return response()->json(['status' => 'success', 'data' => $presentation->fresh()]);
    }

    // DELETE /api/owner/presentations/{id}
    public function destroy($id)
    {
        $presentation = Presentation::where('id', $id)->where('is_global', true)->firstOrFail();
        // Delete file from storage if it was uploaded
        if ($presentation->file_url && str_starts_with($presentation->file_url, '/storage/')) {
            $path = str_replace('/storage/', '', $presentation->file_url);
            Storage::disk('public')->delete($path);
        }
        $presentation->delete();
        return response()->json(['status' => 'success', 'message' => 'Deleted']);
    }

    // GET /api/presentations/library — for distributors to see all global presentations
    public function library()
    {
        $items = Presentation::where('is_global', true)
            ->where('is_active', true)
            ->orderBy('content_type')
            ->orderByDesc('created_at')
            ->get();
        return response()->json(['status' => 'success', 'data' => $items]);
    }

    /**
     * Parse compensation plan fields into structured animated data.
     * This data is used by the mobile app to render an animated comp plan.
     */
    private function parseCompPlanData(array $data): array
    {
        $ranks = [];
        $commissions = [];
        $bonuses = [];
        $requirements = [];

        try {
            if (!empty($data['comp_ranks'])) {
                $ranks = json_decode($data['comp_ranks'], true) ?? [];
            }
            if (!empty($data['comp_commissions'])) {
                $commissions = json_decode($data['comp_commissions'], true) ?? [];
            }
            if (!empty($data['comp_bonuses'])) {
                $bonuses = json_decode($data['comp_bonuses'], true) ?? [];
            }
            if (!empty($data['comp_requirements'])) {
                $requirements = json_decode($data['comp_requirements'], true) ?? [];
            }
        } catch (\Throwable $e) {
            Log::error('Comp plan parse error: ' . $e->getMessage());
        }

        // If no structured data provided, use the system's existing rank/bonus data
        if (empty($ranks)) {
            $ranks = [
                ['name' => 'CT',      'label' => 'Customer Trainee',           'color' => '#6B7280', 'level' => 1],
                ['name' => 'MT',      'label' => 'Market Trainee',             'color' => '#3B82F6', 'level' => 2],
                ['name' => 'TT',      'label' => 'Team Trainee',               'color' => '#8B5CF6', 'level' => 3],
                ['name' => 'NTB',     'label' => 'National Team Builder',      'color' => '#10B981', 'level' => 4],
                ['name' => 'IBB',     'label' => 'Intl. Business Builder',     'color' => '#F59E0B', 'level' => 5],
                ['name' => 'GEB',     'label' => 'Global Empire Builder',      'color' => '#EF4444', 'level' => 6],
                ['name' => 'CA',      'label' => 'Crown Achiever',             'color' => '#F97316', 'level' => 7, 'bonus' => 50000],
                ['name' => 'C_AWARD', 'label' => 'Crown Award',                'color' => '#EC4899', 'level' => 8, 'bonus' => 100000],
                ['name' => 'AL',      'label' => 'Alpha Legend',               'color' => '#6366F1', 'level' => 9, 'bonus' => 500000],
            ];
        }

        if (empty($commissions)) {
            $commissions = [
                ['type' => 'Referral Commission', 'rate' => '10-25%', 'description' => 'Earn on every product sale you refer'],
                ['type' => 'Team Override',       'rate' => '5-15%',  'description' => 'Earn from your downline team sales'],
                ['type' => 'Rank Bonus',          'rate' => 'Up to $500K', 'description' => 'One-time bonus on rank achievement'],
            ];
        }

        if (empty($requirements)) {
            $requirements = [
                ['rank' => 'MT',  'total_pts' => 5000,   'legs' => '4 legs ≥ 200 pts'],
                ['rank' => 'TT',  'total_pts' => 10000,  'legs' => '2 legs with MT+'],
                ['rank' => 'NTB', 'total_pts' => 50000,  'legs' => '4 legs with TT+'],
                ['rank' => 'IBB', 'total_pts' => 200000, 'legs' => '4 legs with NTB+'],
                ['rank' => 'GEB', 'total_pts' => 800000, 'legs' => '4 legs with IBB+'],
            ];
        }

        return [
            'ranks'        => $ranks,
            'commissions'  => $commissions,
            'bonuses'      => $bonuses,
            'requirements' => $requirements,
            'tree_structure' => [
                'max_legs'    => 4,
                'max_depth'   => 'unlimited',
                'description' => 'Build a 4-leg network. Each leg grows independently.',
            ],
        ];
    }
}
