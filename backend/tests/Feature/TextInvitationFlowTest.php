<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\PerformanceController;
use App\Models\Distributor;
use App\Models\Prospect;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TextInvitationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_text_invitation_can_be_created_on_a_legacy_invitations_schema(): void
    {
        [$distributor, $prospect] = $this->actingDistributorWithProspect();

        $this->dropOptionalTextInvitationColumns();

        $response = app(PerformanceController::class)->createInvitation(
            $this->makeAuthenticatedRequest($distributor, [
                'prospect_id' => $prospect->prospect_id,
                'invitation_type' => 'text',
                'invitation_method' => 'whatsapp',
                'script_used' => 'Hello from the test flow.',
                'prospect_value' => 'warm',
            ])
        );

        $this->assertSame(201, $response->getStatusCode(), $response->getContent());

        $payload = $response->getData(true);

        $this->assertSame('success', $payload['status']);
        $this->assertSame($prospect->prospect_id, $payload['data']['prospect_id']);
        $this->assertSame('sent', $payload['data']['status']);

        $this->assertDatabaseHas('invitations', [
            'prospect_id' => $prospect->prospect_id,
            'distributor_id' => $distributor->distributor_id,
            'invitation_type' => 'text',
            'status' => 'sent',
        ]);

        $this->assertDatabaseHas('prospects', [
            'prospect_id' => $prospect->prospect_id,
            'stage' => 'Awaiting Response',
            'status' => 'Awaiting Response',
        ]);
    }

    public function test_text_invitation_response_can_be_saved_on_a_legacy_invitations_schema(): void
    {
        [$distributor, $prospect] = $this->actingDistributorWithProspect();

        $this->dropOptionalTextInvitationColumns();

        $createResponse = app(PerformanceController::class)->createInvitation(
            $this->makeAuthenticatedRequest($distributor, [
                'prospect_id' => $prospect->prospect_id,
                'invitation_type' => 'text',
                'invitation_method' => 'whatsapp',
                'script_used' => 'Hello from the test flow.',
            ],
                method: 'POST'
            )
        );

        $this->assertSame(201, $createResponse->getStatusCode(), $createResponse->getContent());
        $invitationId = $createResponse->getData(true)['data']['invitation_id'];

        $response = app(PerformanceController::class)->updateTextInvitationResponse(
            $this->makeAuthenticatedRequest($distributor, [
                'response' => 'interested',
                'meeting_details' => [
                    'type' => 'presentation',
                    'location' => 'Zoom',
                    'time' => 'Tomorrow 3 PM',
                ],
            ], 'PATCH', "/api/invitations/{$invitationId}/response"),
            $invitationId
        );

        $this->assertSame(200, $response->getStatusCode(), $response->getContent());

        $payload = $response->getData(true);

        $this->assertSame('success', $payload['status']);
        $this->assertSame('interested', $payload['response']);
        $this->assertSame('Presentation Scheduled', $payload['new_stage']);

        $this->assertDatabaseHas('invitations', [
            'invitation_id' => $invitationId,
            'status' => 'accepted',
            'outcome' => 'interested',
        ]);

        $this->assertDatabaseHas('prospects', [
            'prospect_id' => $prospect->prospect_id,
            'stage' => 'Presentation Scheduled',
            'status' => 'Presentation Scheduled',
        ]);
    }

    private function actingDistributorWithProspect(): array
    {
        $distributor = Distributor::create([
            'name' => 'Test Distributor',
            'email' => 'distributor@example.com',
            'phone' => '0911000000',
            'password' => bcrypt('secret123'),
            'status' => 'active',
        ]);

        $prospect = Prospect::create([
            'distributor_id' => $distributor->distributor_id,
            'name' => 'Test Prospect',
            'phone' => '0911222333',
            'status' => 'Contacted',
            'stage' => 'Contacted',
            'interest_level' => 'warm',
            'interest_score' => 45,
        ]);

        return [$distributor, $prospect];
    }

    private function dropOptionalTextInvitationColumns(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropColumn([
                'sent_at',
                'smart_check_at',
                'response_minutes',
                'prospect_value',
                'meeting_details',
            ]);
        });
    }

    private function makeAuthenticatedRequest(
        Distributor $distributor,
        array $data,
        string $method = 'POST',
        string $uri = '/api/invitations',
    ): Request {
        $request = Request::create($uri, $method, $data, [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/x-www-form-urlencoded',
        ]);

        $request->setUserResolver(fn () => $distributor);

        return $request;
    }
}
