-- Phase 19: Invoices, Installments, Documents, Deliveries, and Payment Records (Accounts Receivable)

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    opportunity_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    agreement_version INTEGER NOT NULL,
    agreement_document_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting_approval', -- draft, waiting_approval, approved, sent, partially_paid, paid, overdue, void, superseded
    currency TEXT NOT NULL DEFAULT 'PHP',
    subtotal BIGINT NOT NULL, -- minor units (centavos)
    tax_amount BIGINT NOT NULL DEFAULT 0,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    total_amount BIGINT NOT NULL, -- minor units (centavos)
    amount_paid BIGINT NOT NULL DEFAULT 0,
    balance_due BIGINT NOT NULL, -- minor units (centavos)
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_terms TEXT NOT NULL,
    billing_entity JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_entity JSONB NOT NULL DEFAULT '{}'::jsonb,
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    internal_notes TEXT,
    tax_status TEXT NOT NULL DEFAULT 'unconfigured', -- unconfigured, exclusive, inclusive, not_applicable, operator_confirmed
    tax_metadata JSONB DEFAULT '{}'::jsonb,
    content_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,
    superseded_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS invoice_installments (
    id TEXT PRIMARY KEY,
    agreement_id TEXT NOT NULL,
    invoice_id TEXT,
    installment_type TEXT NOT NULL, -- deposit, milestone, final, custom
    sequence INTEGER NOT NULL DEFAULT 1,
    percentage NUMERIC(5, 2) NOT NULL,
    amount BIGINT NOT NULL, -- minor units (centavos)
    trigger TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, invoiced, paid, cancelled
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_documents (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'waiting_approval', -- draft, waiting_approval, approved, superseded
    pdf_reference TEXT NOT NULL,
    rendered_html TEXT,
    content_hash TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    superseded_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS invoice_deliveries (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    invoice_document_id TEXT NOT NULL,
    recipient TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'gmail',
    status TEXT NOT NULL DEFAULT 'pending_approval', -- pending_approval, approved, sending, sent, failed, rejected
    provider_message_id TEXT,
    provider_thread_id TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_records (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    amount BIGINT NOT NULL, -- minor units (centavos)
    currency TEXT NOT NULL DEFAULT 'PHP',
    payment_method TEXT NOT NULL, -- bank_transfer, gcash, maya, paypal, cash, other
    payment_reference TEXT NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending_verification', -- reported, pending_verification, verified, rejected, reversed
    evidence_type TEXT,
    evidence_reference TEXT,
    notes TEXT,
    recorded_by TEXT NOT NULL DEFAULT 'operator',
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified_by TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    reversed_at TIMESTAMP WITH TIME ZONE,
    reversal_reason TEXT
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_invoices_agreement ON invoices(agreement_id);
CREATE INDEX IF NOT EXISTS idx_invoices_opportunity ON invoices(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_docs_invoice ON invoice_documents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_deliv_invoice ON invoice_deliveries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payment_records(invoice_id);