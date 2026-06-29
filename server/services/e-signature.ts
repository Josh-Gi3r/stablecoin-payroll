/**
 * E-signature provider abstraction.
 *
 * Default: in-app typed signature (captures name/email/ip/timestamp on the
 * contracts.signatures JSON column — no external round-trip).
 * Stubs: DocuSign and Adobe adapters that implement the same interface, so
 * the rest of the system doesn't care which provider is in use.
 */

export interface ESignatureEnvelopeRequest {
  contractId: string;
  title: string;
  body: string;
  signers: Array<{ party: 'operator' | 'client' | 'employee'; name: string; email: string }>;
}

export interface ESignatureProvider {
  name: 'in_app_typed' | 'docusign' | 'adobe';
  /**
   * Kick off an external signing ceremony. Returns a URL each signer should
   * visit (in-app returns null — signing happens inside the platform).
   */
  createEnvelope(req: ESignatureEnvelopeRequest): Promise<{ envelopeId: string; signerUrls: Record<string, string | null> }>;
  /**
   * Fetch the current state of an external envelope.
   */
  getEnvelopeStatus(envelopeId: string): Promise<{
    status: 'sent' | 'delivered' | 'completed' | 'voided' | 'declined';
    completedAt?: string;
  }>;
}

export class InAppTypedProvider implements ESignatureProvider {
  name = 'in_app_typed' as const;

  async createEnvelope(req: ESignatureEnvelopeRequest) {
    // No external ceremony — signing happens via POST /api/contracts/:id/sign.
    const signerUrls: Record<string, string | null> = {};
    for (const signer of req.signers) {
      signerUrls[signer.party] = null;
    }
    return { envelopeId: `inapp-${req.contractId}`, signerUrls };
  }

  async getEnvelopeStatus(_envelopeId: string): Promise<{ status: 'sent' | 'delivered' | 'completed' | 'voided' | 'declined'; completedAt?: string }> {
    // Caller should check the contract.signatures JSON directly.
    return { status: 'sent' };
  }
}

/**
 * Stub adapter. In production, wire to the DocuSign REST API
 * (https://developers.docusign.com/docs/esign-rest-api/). Drops in behind
 * the same interface — no consumer changes required.
 */
export class DocusignProvider implements ESignatureProvider {
  name = 'docusign' as const;
  constructor(private config: { accountId: string; accessToken: string; baseUrl: string }) {}

  async createEnvelope(_req: ESignatureEnvelopeRequest): Promise<{ envelopeId: string; signerUrls: Record<string, string | null> }> {
    throw new Error('DocuSign adapter not yet wired. Provide credentials and implement the envelope create call.');
  }

  async getEnvelopeStatus(_envelopeId: string): Promise<{ status: 'sent' | 'delivered' | 'completed' | 'voided' | 'declined'; completedAt?: string }> {
    throw new Error('DocuSign adapter not yet wired.');
  }
}

/**
 * Stub adapter for Adobe Acrobat Sign.
 */
export class AdobeSignProvider implements ESignatureProvider {
  name = 'adobe' as const;
  constructor(private config: { integrationKey: string; baseUrl: string }) {}

  async createEnvelope(_req: ESignatureEnvelopeRequest): Promise<{ envelopeId: string; signerUrls: Record<string, string | null> }> {
    throw new Error('Adobe Sign adapter not yet wired.');
  }

  async getEnvelopeStatus(_envelopeId: string): Promise<{ status: 'sent' | 'delivered' | 'completed' | 'voided' | 'declined'; completedAt?: string }> {
    throw new Error('Adobe Sign adapter not yet wired.');
  }
}

// Default provider exported as a singleton. Swap by reassigning at startup:
//   eSignatureProvider = new DocusignProvider({ ... });
export let eSignatureProvider: ESignatureProvider = new InAppTypedProvider();

export function setESignatureProvider(provider: ESignatureProvider) {
  eSignatureProvider = provider;
}
