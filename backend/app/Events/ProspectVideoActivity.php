<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast when a prospect opens (or closes) a presentation video.
 * The mobile app listens on prospect.{id} channel for .video.opened / .video.closed
 */
class ProspectVideoActivity implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $prospectId;
    public string $event; // 'opened' | 'closed'
    public int $distributorId;

    public function __construct(int $prospectId, int $distributorId, string $event = 'opened')
    {
        $this->prospectId    = $prospectId;
        $this->distributorId = $distributorId;
        $this->event         = $event;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('prospect.' . $this->prospectId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'video.' . $this->event; // -> .video.opened or .video.closed
    }

    public function broadcastWith(): array
    {
        return [
            'prospect_id'    => $this->prospectId,
            'distributor_id' => $this->distributorId,
            'event'          => $this->event,
            'at'             => now()->toISOString(),
        ];
    }
}
