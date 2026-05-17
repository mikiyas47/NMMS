<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $presentation->title ?? 'Presentation' }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f9fafb; }
        .video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; background: #000; border-radius: 12px; }
        .video-container iframe, .video-container video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    </style>
</head>
<body class="antialiased min-h-screen flex flex-col items-center p-4">
    <div class="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
                <h1 class="text-xl font-bold text-gray-900">{{ $presentation->title ?? 'Exclusive Presentation' }}</h1>
                <p class="text-sm text-gray-500 mt-1">Shared by {{ $distributor->name ?? 'your distributor' }}</p>
            </div>
        </div>

        <!-- Content Area -->
        <div class="p-6 bg-gray-50">
            @if($presentation->content_type === 'video' || $presentation->external_url)
                <div class="video-container shadow-md">
                    @if(str_contains($presentation->external_url, 'youtube.com') || str_contains($presentation->external_url, 'youtu.be'))
                        <!-- YouTube embed -->
                        <iframe id="yt-player" type="text/html" width="100%" height="100%"
                          src="{{ \Illuminate\Support\Str::replace('watch?v=', 'embed/', $presentation->external_url) }}?enablejsapi=1"
                          frameborder="0" allowfullscreen></iframe>
                    @else
                        <!-- Native video player -->
                        <video id="native-player" controls preload="metadata">
                            <source src="{{ $presentation->external_url ?? $presentation->file_url }}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    @endif
                </div>
            @else
                <!-- PDF / Image Viewer -->
                <div class="w-full h-96 overflow-auto border border-gray-200 rounded-lg bg-gray-200 flex items-center justify-center">
                    @if(str_ends_with($presentation->file_url, '.pdf'))
                        <iframe src="{{ $presentation->file_url }}" width="100%" height="100%"></iframe>
                    @else
                        <img src="{{ $presentation->file_url }}" class="max-w-full max-h-full object-contain" />
                    @endif
                </div>
            @endif
        </div>

        <!-- CTA Area -->
        <div class="p-6 text-center border-t border-gray-100 bg-white">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Ready to take the next step?</h3>
            @if($presentation->cta_link)
                <button id="cta-btn" class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
                    {{ $presentation->cta_text ?? 'Get Started Now' }}
                </button>
            @else
                <button id="cta-btn" class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
                    Contact {{ explode(' ', trim($distributor->name ?? 'Distributor'))[0] }}
                </button>
            @endif
        </div>
    </div>

    <script>
        const token = "{{ $token }}";
        const isYoutube = {{ str_contains($presentation->external_url ?? '', 'youtu') ? 'true' : 'false' }};
        let watchDuration = 0;
        let watchPercent = 0;
        let timer = null;
        let heartbeatInterval = null;
        let ytPlayer;
        let isClosed = false;

        const API_URL = `/api/p/${token}/track`;

        function sendTrackingData(event_type, extras = {}) {
            if (isClosed && event_type !== 'closed') return;
            return fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    action: event_type,
                    watch_percent: Math.floor(watchPercent),
                    time_spent: Math.floor(watchDuration),
                    device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
                    ...extras
                })
            }).catch(e => console.error('Track error:', e));
        }

        // ── STEP 1: Send "opened" immediately on page load ──────────────────
        sendTrackingData('opened');

        // ── STEP 2: Send heartbeat every 15 seconds to keep "watching" alive ─
        heartbeatInterval = setInterval(() => {
            watchDuration += 15;
            sendTrackingData('heartbeat');
        }, 15000);

        // ── CTA Click ────────────────────────────────────────────────────────
        document.getElementById('cta-btn').addEventListener('click', () => {
            sendTrackingData('cta_clicked');
            const link = "{{ $presentation->cta_link }}";
            if(link) window.open(link, '_blank');
            else alert('Please reach out to your distributor directly.');
        });

        // ── Track Exit ────────────────────────────────────────────────────────
        window.addEventListener('beforeunload', () => {
            isClosed = true;
            clearInterval(heartbeatInterval);
            clearInterval(timer);
            // Use sendBeacon for reliable delivery on page close
            navigator.sendBeacon(API_URL, JSON.stringify({
                action: 'closed',
                watch_percent: Math.floor(watchPercent),
                time_spent: Math.floor(watchDuration),
                device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
            }));
        });

        // ── Initialize Players ────────────────────────────────────────────────
        if (isYoutube) {
            let tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);

            window.onYouTubeIframeAPIReady = function() {
                ytPlayer = new YT.Player('yt-player', {
                    events: { 'onStateChange': onPlayerStateChange }
                });
            };

            function onPlayerStateChange(event) {
                if (event.data == YT.PlayerState.PLAYING && !timer) {
                    timer = setInterval(() => {
                        watchDuration++;
                        let duration = ytPlayer.getDuration();
                        if(duration > 0) {
                            watchPercent = (ytPlayer.getCurrentTime() / duration) * 100;
                            checkMilestones();
                        }
                    }, 1000);
                } else if (event.data != YT.PlayerState.PLAYING) {
                    clearInterval(timer); timer = null;
                    if(event.data == YT.PlayerState.ENDED) {
                        watchPercent = 100;
                        checkMilestones();
                        sendTrackingData('completed');
                    }
                }
            }
        } else {
            const nativePlayer = document.getElementById('native-player');
            if (nativePlayer) {
                nativePlayer.addEventListener('play', () => {
                    if(!timer) {
                        timer = setInterval(() => {
                            watchDuration++;
                            if(nativePlayer.duration > 0) {
                                watchPercent = (nativePlayer.currentTime / nativePlayer.duration) * 100;
                                checkMilestones();
                            }
                        }, 1000);
                    }
                });
                nativePlayer.addEventListener('pause', () => { clearInterval(timer); timer = null; });
                nativePlayer.addEventListener('ended', () => {
                    watchPercent = 100; checkMilestones(); sendTrackingData('completed');
                });
            } else {
                // PDF tracking
                setInterval(() => { watchDuration++; }, 1000);
            }
        }

        const milestones = [25, 50, 75, 95];
        let reachedMilestones = new Set();
        function checkMilestones() {
            milestones.forEach(m => {
                if (watchPercent >= m && !reachedMilestones.has(m)) {
                    reachedMilestones.add(m);
                    sendTrackingData(`watched_${m}_percent`);
                }
            });
        }
    </script>
</body>
</html>
