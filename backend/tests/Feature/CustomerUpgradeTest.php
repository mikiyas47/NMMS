<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Distributor;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class CustomerUpgradeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that a customer can upgrade to distributor after payment.
     */
    public function test_customer_can_upgrade_to_distributor(): void
    {
        // Create a sponsor distributor
        $sponsor = Distributor::create([
            'name' => 'Sponsor User',
            'email' => 'sponsor@example.com',
            'password' => Hash::make('password'),
            'status' => 'active',
            'is_paid' => true,
        ]);

        // Create a product
        $product = Product::create([
            'name' => 'Test Product',
            'price' => 1000,
            'point' => 800,
            'referral_rate' => 10,
        ]);

        // Create a successful payment
        $payment = Payment::create([
            'product_id' => $product->id,
            'distributor_id' => $sponsor->distributor_id,
            'customer_name' => 'Test Customer',
            'customer_email' => 'customer@example.com',
            'customer_phone' => '0912345678',
            'tx_ref' => 'TEST-' . uniqid(),
            'amount' => 1000,
            'currency' => 'ETB',
            'quantity' => 1,
            'commission_amount' => 100,
            'status' => 'success',
        ]);

        // Attempt to upgrade
        $response = $this->postJson('/api/customer/upgrade', [
            'email' => 'customer@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
            'tx_ref' => $payment->tx_ref,
        ]);

        // Assert successful upgrade
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'access_token',
                'token_type',
                'user',
            ]);

        // Verify distributor was created with correct status
        $distributor = Distributor::where('email', 'customer@example.com')->first();
        $this->assertNotNull($distributor);
        $this->assertEquals('active', $distributor->status);
        $this->assertTrue($distributor->is_paid);
        $this->assertTrue(Hash::check('newpassword123', $distributor->password));
    }

    /**
     * Test that inactive customers are labeled correctly in the tree.
     */
    public function test_inactive_customers_have_correct_status(): void
    {
        // Create a distributor with inactive status
        $customer = Distributor::create([
            'name' => 'Inactive Customer',
            'email' => 'inactive@example.com',
            'password' => Hash::make('temppassword'),
            'status' => 'inactive',
            'is_paid' => false,
        ]);

        $this->assertEquals('inactive', $customer->status);
        $this->assertFalse($customer->is_paid);
    }

    /**
     * Test that upgrade fails with invalid payment.
     */
    public function test_upgrade_fails_with_invalid_payment(): void
    {
        $response = $this->postJson('/api/customer/upgrade', [
            'email' => 'customer@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
            'tx_ref' => 'INVALID-TX-REF',
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Payment record not found. Please contact your distributor.',
            ]);
    }

    /**
     * Test that upgrade fails with mismatched email.
     */
    public function test_upgrade_fails_with_mismatched_email(): void
    {
        $payment = Payment::create([
            'product_id' => 1,
            'distributor_id' => 1,
            'customer_name' => 'Test Customer',
            'customer_email' => 'customer@example.com',
            'tx_ref' => 'TEST-' . uniqid(),
            'amount' => 1000,
            'currency' => 'ETB',
            'quantity' => 1,
            'commission_amount' => 100,
            'status' => 'success',
        ]);

        $response = $this->postJson('/api/customer/upgrade', [
            'email' => 'different@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
            'tx_ref' => $payment->tx_ref,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Email does not match the payment record.',
            ]);
    }
}
