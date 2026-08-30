-- Phase 20: Real PayPal Payment Integration & Automated Reconciliation

CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'paypal',
    provider_request_id TEXT, -- PayPal Order ID
    currency TEXT NOT NULL DEFAULT 'PHP',
    amount_minor_units BIGINT NOT NULL, -- in minor units (centavos)
    status TEXT NOT NULL DEFAULT 'pending_approval', -- draft, pending_approval, approved, active, completed, expired, cancelled, failed
    checkout_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    payment_request_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'paypal',
    provider_order_id TEXT NOT NULL,
    provider_transaction_id TEXT, -- PayPal Capture ID
    provider_event_id TEXT UNIQUE, -- Webhook event ID for idempotency
    currency TEXT NOT NULL DEFAULT 'PHP',
    amount_minor_units BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, cancelled, refunded, partially_refunded, disputed
    provider_created_at TIMESTAMP WITH TIME ZONE,
    provider_confirmed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_pay_req_invoice ON payment_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pay_req_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_pay_req_prov_id ON payment_requests(provider_request_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_req ON payment_transactions(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_event ON payment_transactions(provider_event_id);