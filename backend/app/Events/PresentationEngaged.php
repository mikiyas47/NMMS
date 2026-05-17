<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PresentationEngaged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $distributorId;
    public $prospectId;
    public $action;
    public $score;
    public $percent;

    /**
     * Create a new event instance.
     */
    public function __construct($distributorId, $prospectId, $action, $score, $percent = 0)
    {
        $this->distributorId = $distributorId;
        $this->prospectId = $prospectId;
        $this->action = $action;
        $this->score = $score;
        $this->percent = $percent;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('distributor.' . $this->distributorId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'PresentationEngaged';
    }
}
