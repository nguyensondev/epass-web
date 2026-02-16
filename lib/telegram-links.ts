// Shared storage for pending Telegram links
// In production, use Redis or a database

export interface PendingLink {
  chatId: string;
  phoneNumber?: string;
  expiresAt: number;
}

class PendingLinksStore {
  private links = new Map<string, PendingLink>();

  set(code: string, link: PendingLink): void {
    this.links.set(code, link);
  }

  get(code: string): PendingLink | undefined {
    return this.links.get(code);
  }

  delete(code: string): void {
    this.links.delete(code);
  }

  // Clean up expired codes
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.links.entries());
    for (const [code, link] of entries) {
      if (link.expiresAt < now) {
        this.links.delete(code);
      }
    }
  }
}

export const pendingLinksStore = new PendingLinksStore();

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    pendingLinksStore.cleanup();
  }, 5 * 60 * 1000);
}

// Generate a 6-digit code
export function generateLinkCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
