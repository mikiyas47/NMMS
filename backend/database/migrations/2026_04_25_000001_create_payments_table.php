<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // References
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('distributor_id');
            $table->unsignedBigInteger('prospect_id')->nullable();

            // Customer info
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone')->nullable();

            // Transaction
            $table->string('tx_ref')->unique();
            $table->decimal('amount', 12, 2);
            $table->string('currency')->default('ETB');
            $table->integer('quantity')->default(1);

            // Chapa
            $table->string('chapa_reference')->nullable();
            $table->text('payment_url')->nullable();

            // Status
            $table->enum('status', ['pending', 'success', 'failed', 'rejected'])->default('pending');

            // Commission
            $table->decimal('commission_amount', 12, 2)->default(0);
            $table->boolean('commission_paid')->default(false);

            // Webhook
            $table->boolean('webhook_verified')->default(false);
            $table->json('chapa_payload')->nullable();

            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
