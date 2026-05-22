<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceApiCors
{
    /**
     * Handle an incoming request.
     *
     * FIX: Reflect ANY origin back to allow all origins while keeping credentials support.
     * This is necessary because Access-Control-Allow-Origin: * cannot be used with
     * Access-Control-Allow-Credentials: true.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get the origin from the request, or use a default
        $origin = $request->headers->get('Origin', '*');

        // Handle preflight OPTIONS request immediately (before hitting the app)
        if ($request->isMethod('OPTIONS')) {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', $origin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')
                ->header('Access-Control-Allow-Credentials', 'true')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        // Attach CORS headers to every API response
        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}
