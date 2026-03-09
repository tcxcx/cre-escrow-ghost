# Contract Lifecycle Email Templates

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create 8 email templates for the AI escrow contract pipeline — covering invitation, signing, funding, deliverables, verification, disputes, and completion — using the existing `@bu/email` component library.

**Architecture:** Each template follows the established pattern: `Html → Tailwind → BodyGradient → Container → [SpookyLogo, Heading, purple cards, CTA buttons, TopFooter, MarqueeBufi] → Footer`. All templates export named components with default props, are registered in `index.ts` and `package.json` exports.

**Tech Stack:** React Email, @react-email/components, Tailwind (via @react-email/tailwind), @bu/email shared components (BodyGradient, Container, SpookyLogo, FontPoppins, Badge, CardPurple, TopFooter, MarqueeBufi, Footer)

---

## Email Templates Overview

| # | Template | Trigger | Recipient | CTA |
|---|----------|---------|-----------|-----|
| 1 | Contract Invitation | Payer creates contract | Payee (counterparty) | "Review & Sign Contract" |
| 2 | Contract Signed | Both parties signed | Both parties | "View Contract" |
| 3 | Contract Funded | Escrow funded | Payee | "View Contract" |
| 4 | Signing Reminder | Cron / manual | Unsigned party | "Sign Now" |
| 5 | Deliverable Submitted | Payee submits work | Payer | "Review Deliverable" |
| 6 | Verification Result | AI verifies | Both parties | "View Report" |
| 7 | Dispute Resolution | Arbitration completes | Both parties | "View Decision" |
| 8 | Contract Completed | All milestones released | Both parties | "View Receipt" |

---

### Task 1: Contract Invitation Email

**Files:**
- Create: `packages/email/emails/contract-invitation.tsx`
- Modify: `packages/email/index.ts`
- Modify: `packages/email/package.json`

**Step 1: Create the template**

```tsx
import {
  Button,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { getAppUrl } from '@bu/env/app';
import { Footer } from '../components/footer';
import { SpookyLogo } from '../components/spooky-logo';
import { FontPoppins } from '../components/font';
import { TopFooter } from '../components/top-footer';
import { BodyGradient } from '../components/body-gradient';
import { Container } from '../components/container';
import { MarqueeBufi } from '../components/marquee';
import { Badge } from '../components/badge';

interface Props {
  recipientName: string;
  senderName: string;
  senderTeamName: string;
  contractTitle: string;
  totalAmount: string;
  currency: string;
  milestoneCount: number;
  link: string;
}

const baseUrl = getAppUrl() ? `https://${getAppUrl()}` : '';

export const ContractInvitationEmail = ({
  recipientName = 'Counterparty',
  senderName = 'Maria González',
  senderTeamName = 'Acme Corp',
  contractTitle = 'Website Redesign',
  totalAmount = '5,000.00',
  currency = 'USDC',
  milestoneCount = 3,
  link = 'https://desk.bu.finance/contracts/review/abc123',
}: Props) => {
  const text = `${senderName} from ${senderTeamName} has invited you to sign a contract`;

  return (
    <Html>
      <Preview>{text}</Preview>
      <Tailwind>
        <Head>
          <FontPoppins />
        </Head>
        <BodyGradient>
          <Container>
            <Section className="text-center justify-center">
              <SpookyLogo />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-indigo-600 text-center">
              You've been invited to sign a contract
            </Heading>

            <Text className="px-6 text-[14px] leading-[24px] text-indigo-600 text-center mb-8">
              Hi {recipientName}, {senderName} from {senderTeamName} has created a contract
              and is requesting your signature.
            </Text>

            <Section className="mb-6">
              <div className="w-full max-w-md mx-auto">
                <Heading as="h2" className="text-indigo-600 font-bold text-lg mb-4 text-center">
                  Contract Details
                </Heading>

                <div className="bg-purple-100 rounded-2xl p-6">
                  <div className="space-y-6">
                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Contract
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-base font-bold">
                          {contractTitle}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Total Value
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-2xl font-bold">
                          ${totalAmount} {currency}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Milestones
                      </Text>
                      <Badge>{milestoneCount} milestone{milestoneCount !== 1 ? 's' : ''}</Badge>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        From
                      </Text>
                      <Badge>{senderTeamName}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section className="my-8 text-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold no-underline text-center py-4 px-8 border border-solid border-indigo-600 rounded-lg"
                href={link}
              >
                Review & Sign Contract
              </Button>
            </Section>

            <Section className="mb-8">
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center">
                This contract uses AI-powered escrow to protect both parties. Funds are held
                securely until deliverables are verified by a neutral AI arbitrator.
              </Text>
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center mt-4">
                Don't recognize this invitation?{' '}
                <a href="mailto:hello@bu.finance" className="text-indigo-600 underline">
                  Report it here
                </a>
              </Text>
            </Section>

            <Section className="text-center">
              <TopFooter />
            </Section>
            <Section className="text-center">
              <MarqueeBufi />
            </Section>
          </Container>
          <Footer />
        </BodyGradient>
      </Tailwind>
    </Html>
  );
};

export default ContractInvitationEmail;
```

**Step 2: Add export to `packages/email/index.ts`**

```typescript
// Contract Lifecycle
export { ContractInvitationEmail } from './emails/contract-invitation';
```

**Step 3: Add subpath export to `packages/email/package.json`**

Add to the `"exports"` object:

```json
"./contract-invitation": {
  "types": "./dist/emails/contract-invitation.d.ts",
  "default": "./dist/emails/contract-invitation.js"
}
```

**Step 4: Commit**

```bash
git add packages/email/emails/contract-invitation.tsx packages/email/index.ts packages/email/package.json
git commit -m "feat(email): add contract invitation email template"
```

---

### Task 2: Contract Signed Email

**Files:**
- Create: `packages/email/emails/contract-signed.tsx`
- Modify: `packages/email/index.ts`
- Modify: `packages/email/package.json`

**Step 1: Create the template**

```tsx
import {
  Button,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { getAppUrl } from '@bu/env/app';
import { Footer } from '../components/footer';
import { SpookyLogo } from '../components/spooky-logo';
import { FontPoppins } from '../components/font';
import { TopFooter } from '../components/top-footer';
import { BodyGradient } from '../components/body-gradient';
import { Container } from '../components/container';
import { MarqueeBufi } from '../components/marquee';
import { Badge } from '../components/badge';

interface Props {
  recipientName: string;
  contractTitle: string;
  totalAmount: string;
  currency: string;
  payerName: string;
  payeeName: string;
  signedAt: string;
  link: string;
}

const baseUrl = getAppUrl() ? `https://${getAppUrl()}` : '';

export const ContractSignedEmail = ({
  recipientName = 'User',
  contractTitle = 'Website Redesign',
  totalAmount = '5,000.00',
  currency = 'USDC',
  payerName = 'Acme Corp',
  payeeName = 'Jane Developer',
  signedAt = 'March 8, 2026',
  link = 'https://desk.bu.finance/contracts/abc123',
}: Props) => {
  const text = `Contract "${contractTitle}" has been signed by both parties`;

  return (
    <Html>
      <Preview>{text}</Preview>
      <Tailwind>
        <Head>
          <FontPoppins />
        </Head>
        <BodyGradient>
          <Container>
            <Section className="text-center justify-center">
              <SpookyLogo />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-indigo-600 text-center">
              Contract Fully Signed ✓
            </Heading>

            <Text className="px-6 text-[14px] leading-[24px] text-indigo-600 text-center mb-8">
              Hi {recipientName}, both parties have signed the contract. The agreement is now active.
            </Text>

            <Section className="mb-6">
              <div className="w-full max-w-md mx-auto">
                <Heading as="h2" className="text-indigo-600 font-bold text-lg mb-4 text-center">
                  Agreement Details
                </Heading>

                <div className="bg-purple-100 rounded-2xl p-6">
                  <div className="space-y-6">
                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Contract
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-base font-bold">
                          {contractTitle}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Total Value
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-2xl font-bold">
                          ${totalAmount} {currency}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Status
                      </Text>
                      <Badge>Active</Badge>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Parties
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm">
                          {payerName} (Payer) — {payeeName} (Payee)
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Signed
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm font-bold">{signedAt}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section className="my-8 text-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold no-underline text-center py-4 px-8 border border-solid border-indigo-600 rounded-lg"
                href={link}
              >
                View Contract
              </Button>
            </Section>

            <Section className="mb-8">
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center">
                Next step: The payer needs to fund the escrow to activate milestone deliverables.
              </Text>
            </Section>

            <Section className="text-center">
              <TopFooter />
            </Section>
            <Section className="text-center">
              <MarqueeBufi />
            </Section>
          </Container>
          <Footer />
        </BodyGradient>
      </Tailwind>
    </Html>
  );
};

export default ContractSignedEmail;
```

**Step 2: Add export + subpath (same pattern as Task 1)**

**Step 3: Commit**

```bash
git add packages/email/emails/contract-signed.tsx packages/email/index.ts packages/email/package.json
git commit -m "feat(email): add contract signed email template"
```

---

### Task 3: Contract Funded Email

**Files:**
- Create: `packages/email/emails/contract-funded.tsx`
- Modify: `packages/email/index.ts`
- Modify: `packages/email/package.json`

**Step 1: Create the template**

```tsx
import {
  Button,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { getAppUrl } from '@bu/env/app';
import { Footer } from '../components/footer';
import { SpookyLogo } from '../components/spooky-logo';
import { FontPoppins } from '../components/font';
import { TopFooter } from '../components/top-footer';
import { BodyGradient } from '../components/body-gradient';
import { Container } from '../components/container';
import { MarqueeBufi } from '../components/marquee';
import { Badge } from '../components/badge';

interface Props {
  recipientName: string;
  contractTitle: string;
  fundedAmount: string;
  currency: string;
  payerName: string;
  firstMilestoneTitle: string;
  link: string;
}

const baseUrl = getAppUrl() ? `https://${getAppUrl()}` : '';

export const ContractFundedEmail = ({
  recipientName = 'Contractor',
  contractTitle = 'Website Redesign',
  fundedAmount = '5,000.00',
  currency = 'USDC',
  payerName = 'Acme Corp',
  firstMilestoneTitle = 'Design Mockups',
  link = 'https://desk.bu.finance/contracts/abc123',
}: Props) => {
  const text = `Escrow funded — ${contractTitle} is ready to begin`;

  return (
    <Html>
      <Preview>{text}</Preview>
      <Tailwind>
        <Head>
          <FontPoppins />
        </Head>
        <BodyGradient>
          <Container>
            <Section className="text-center justify-center">
              <SpookyLogo />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-indigo-600 text-center">
              Escrow Funded — Work Can Begin
            </Heading>

            <Text className="px-6 text-[14px] leading-[24px] text-indigo-600 text-center mb-8">
              Hi {recipientName}, {payerName} has funded the escrow for your contract. You can now
              start working on your deliverables.
            </Text>

            <Section className="mb-6">
              <div className="w-full max-w-md mx-auto">
                <Heading as="h2" className="text-indigo-600 font-bold text-lg mb-4 text-center">
                  Escrow Details
                </Heading>

                <div className="bg-purple-100 rounded-2xl p-6">
                  <div className="space-y-6">
                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Amount Secured
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-2xl font-bold">
                          ${fundedAmount} {currency}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Status
                      </Text>
                      <Badge>Funded</Badge>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        First Milestone
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm font-bold">
                          {firstMilestoneTitle}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section className="my-8 text-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold no-underline text-center py-4 px-8 border border-solid border-indigo-600 rounded-lg"
                href={link}
              >
                View Contract & Start Working
              </Button>
            </Section>

            <Section className="mb-8">
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center">
                Funds are held in a secure AI-managed escrow. When you submit deliverables,
                they'll be verified by a neutral AI arbitrator before funds are released.
              </Text>
            </Section>

            <Section className="text-center">
              <TopFooter />
            </Section>
            <Section className="text-center">
              <MarqueeBufi />
            </Section>
          </Container>
          <Footer />
        </BodyGradient>
      </Tailwind>
    </Html>
  );
};

export default ContractFundedEmail;
```

**Step 2: Add export + subpath**

**Step 3: Commit**

```bash
git add packages/email/emails/contract-funded.tsx packages/email/index.ts packages/email/package.json
git commit -m "feat(email): add contract funded email template"
```

---

### Task 4: Signing Reminder Email

**Files:**
- Create: `packages/email/emails/contract-signing-reminder.tsx`
- Modify: `packages/email/index.ts`
- Modify: `packages/email/package.json`

**Step 1: Create the template**

Follow the exact pattern of `invoice-reminder.tsx` but for contract signing:

```tsx
import {
  Button,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { Footer } from '../components/footer';
import { SpookyLogo } from '../components/spooky-logo';
import { FontPoppins } from '../components/font';
import { TopFooter } from '../components/top-footer';
import { BodyGradient } from '../components/body-gradient';
import { Container } from '../components/container';
import { MarqueeBufi } from '../components/marquee';

interface Props {
  recipientName: string;
  senderTeamName: string;
  contractTitle: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  link: string;
}

export const ContractSigningReminderEmail = ({
  recipientName = 'Counterparty',
  senderTeamName = 'Acme Corp',
  contractTitle = 'Website Redesign',
  totalAmount = '5,000.00',
  currency = 'USDC',
  createdAt = 'March 1, 2026',
  link = 'https://desk.bu.finance/contracts/review/abc123',
}: Props) => {
  const text = `Reminder: ${senderTeamName} is waiting for your signature on "${contractTitle}"`;

  return (
    <Html>
      <Preview>{text}</Preview>
      <Tailwind>
        <Head>
          <FontPoppins />
        </Head>
        <BodyGradient>
          <Container>
            <Section className="text-center justify-center">
              <SpookyLogo />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-indigo-600 text-center">
              Signature Needed
            </Heading>

            <Text className="px-6 text-[14px] leading-[24px] text-indigo-600 text-center mb-8">
              Hi {recipientName}, {senderTeamName} is waiting for your signature on the following contract.
            </Text>

            <Section className="mb-6">
              <div className="w-full max-w-md mx-auto">
                <Heading as="h2" className="text-indigo-600 font-bold text-lg mb-4 text-center">
                  Pending Contract
                </Heading>

                <div className="bg-purple-100 rounded-2xl p-6">
                  <div className="space-y-6">
                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Contract
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-base font-bold">
                          {contractTitle}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Total Value
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-2xl font-bold">
                          ${totalAmount} {currency}
                        </Text>
                      </div>
                    </div>

                    <Section>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Status
                      </Text>
                      <Section>
                        <div className="flex justify-center">
                          <div className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                            Awaiting Signature
                          </div>
                        </div>
                      </Section>
                    </Section>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Sent
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm font-bold">{createdAt}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section className="my-8 text-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold no-underline text-center py-4 px-8 border border-solid border-indigo-600 rounded-lg"
                href={link}
              >
                Review & Sign Now
              </Button>
            </Section>

            <Section className="mb-8">
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center">
                Don't recognize this contract? Contact{' '}
                <a href="mailto:hello@bu.finance" className="text-indigo-600 underline">
                  hello@bu.finance
                </a>
              </Text>
            </Section>

            <Section className="text-center">
              <TopFooter />
            </Section>
            <Section className="text-center">
              <MarqueeBufi />
            </Section>
          </Container>
          <Footer />
        </BodyGradient>
      </Tailwind>
    </Html>
  );
};

export default ContractSigningReminderEmail;
```

**Step 2: Add export + subpath**

**Step 3: Commit**

```bash
git add packages/email/emails/contract-signing-reminder.tsx packages/email/index.ts packages/email/package.json
git commit -m "feat(email): add contract signing reminder email template"
```

---

### Task 5: Deliverable Submitted Email

**Files:**
- Create: `packages/email/emails/contract-deliverable-submitted.tsx`
- Modify: `packages/email/index.ts`
- Modify: `packages/email/package.json`

**Step 1: Create the template**

```tsx
import {
  Button,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { Footer } from '../components/footer';
import { SpookyLogo } from '../components/spooky-logo';
import { FontPoppins } from '../components/font';
import { TopFooter } from '../components/top-footer';
import { BodyGradient } from '../components/body-gradient';
import { Container } from '../components/container';
import { MarqueeBufi } from '../components/marquee';
import { Badge } from '../components/badge';

interface Props {
  recipientName: string;
  payeeName: string;
  contractTitle: string;
  milestoneTitle: string;
  milestoneIndex: number;
  totalMilestones: number;
  milestoneAmount: string;
  currency: string;
  link: string;
}

export const ContractDeliverableSubmittedEmail = ({
  recipientName = 'Client',
  payeeName = 'Jane Developer',
  contractTitle = 'Website Redesign',
  milestoneTitle = 'Design Mockups',
  milestoneIndex = 1,
  totalMilestones = 3,
  milestoneAmount = '1,500.00',
  currency = 'USDC',
  link = 'https://desk.bu.finance/contracts/abc123/milestone/1',
}: Props) => {
  const text = `${payeeName} submitted deliverable for "${milestoneTitle}"`;

  return (
    <Html>
      <Preview>{text}</Preview>
      <Tailwind>
        <Head>
          <FontPoppins />
        </Head>
        <BodyGradient>
          <Container>
            <Section className="text-center justify-center">
              <SpookyLogo />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-indigo-600 text-center">
              Deliverable Submitted for Review
            </Heading>

            <Text className="px-6 text-[14px] leading-[24px] text-indigo-600 text-center mb-8">
              Hi {recipientName}, {payeeName} has submitted work for milestone {milestoneIndex} of {totalMilestones}.
              The AI arbitrator is now verifying the deliverable.
            </Text>

            <Section className="mb-6">
              <div className="w-full max-w-md mx-auto">
                <Heading as="h2" className="text-indigo-600 font-bold text-lg mb-4 text-center">
                  Milestone Details
                </Heading>

                <div className="bg-purple-100 rounded-2xl p-6">
                  <div className="space-y-6">
                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Contract
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-base font-bold">
                          {contractTitle}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Milestone {milestoneIndex} of {totalMilestones}
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm font-bold">
                          {milestoneTitle}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Amount
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-2xl font-bold">
                          ${milestoneAmount} {currency}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Status
                      </Text>
                      <Badge>AI Verifying</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section className="my-8 text-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold no-underline text-center py-4 px-8 border border-solid border-indigo-600 rounded-lg"
                href={link}
              >
                Review Deliverable
              </Button>
            </Section>

            <Section className="mb-8">
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center">
                Our AI arbitrator will analyze the submission against the acceptance criteria.
                You'll receive another email with the verification result.
              </Text>
            </Section>

            <Section className="text-center">
              <TopFooter />
            </Section>
            <Section className="text-center">
              <MarqueeBufi />
            </Section>
          </Container>
          <Footer />
        </BodyGradient>
      </Tailwind>
    </Html>
  );
};

export default ContractDeliverableSubmittedEmail;
```

**Step 2: Add export + subpath**

**Step 3: Commit**

```bash
git add packages/email/emails/contract-deliverable-submitted.tsx packages/email/index.ts packages/email/package.json
git commit -m "feat(email): add deliverable submitted email template"
```

---

### Task 6: AI Verification Result Email

**Files:**
- Create: `packages/email/emails/contract-verification-result.tsx`
- Modify: `packages/email/index.ts`
- Modify: `packages/email/package.json`

**Step 1: Create the template**

```tsx
import {
  Button,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { Footer } from '../components/footer';
import { SpookyLogo } from '../components/spooky-logo';
import { FontPoppins } from '../components/font';
import { TopFooter } from '../components/top-footer';
import { BodyGradient } from '../components/body-gradient';
import { Container } from '../components/container';
import { MarqueeBufi } from '../components/marquee';

interface Props {
  recipientName: string;
  contractTitle: string;
  milestoneTitle: string;
  milestoneIndex: number;
  verdict: 'PASS' | 'REJECTED';
  confidence: number;
  summary: string;
  disputeWindowDays: number;
  link: string;
}

export const ContractVerificationResultEmail = ({
  recipientName = 'User',
  contractTitle = 'Website Redesign',
  milestoneTitle = 'Design Mockups',
  milestoneIndex = 1,
  verdict = 'PASS',
  confidence = 92,
  summary = 'All acceptance criteria met. Design files are complete and match specifications.',
  disputeWindowDays = 7,
  link = 'https://desk.bu.finance/contracts/abc123/milestone/1',
}: Props) => {
  const isPassed = verdict === 'PASS';
  const text = `AI Verification ${isPassed ? 'Passed' : 'Rejected'}: ${milestoneTitle}`;

  return (
    <Html>
      <Preview>{text}</Preview>
      <Tailwind>
        <Head>
          <FontPoppins />
        </Head>
        <BodyGradient>
          <Container>
            <Section className="text-center justify-center">
              <SpookyLogo />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-indigo-600 text-center">
              AI Verification {isPassed ? 'Passed' : 'Rejected'}
            </Heading>

            <Text className="px-6 text-[14px] leading-[24px] text-indigo-600 text-center mb-8">
              Hi {recipientName}, the AI arbitrator has reviewed the deliverable for
              milestone {milestoneIndex} of "{contractTitle}".
            </Text>

            <Section className="mb-6">
              <div className="w-full max-w-md mx-auto">
                <Heading as="h2" className="text-indigo-600 font-bold text-lg mb-4 text-center">
                  Verification Report
                </Heading>

                <div className="bg-purple-100 rounded-2xl p-6">
                  <div className="space-y-6">
                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Milestone
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-base font-bold">
                          {milestoneTitle}
                        </Text>
                      </div>
                    </div>

                    <Section>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Verdict
                      </Text>
                      <Section>
                        <div className="flex justify-center">
                          <div
                            className={`${isPassed ? 'bg-green-600' : 'bg-red-600'} text-white px-4 py-2 rounded-full text-sm font-bold`}
                          >
                            {isPassed ? 'Approved' : 'Rejected'}
                          </div>
                        </div>
                      </Section>
                    </Section>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Confidence
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-2xl font-bold">
                          {confidence}%
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Summary
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm">
                          {summary}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {isPassed && (
              <Section className="mb-6">
                <div className="w-full max-w-md mx-auto">
                  <div className="bg-blue-50 border-blue-200 rounded-lg p-4 border">
                    <Text className="px-6 text-indigo-600 text-sm text-center">
                      A {disputeWindowDays}-day dispute window is now open. Either party may file a
                      dispute if they disagree with the verification. After the window closes,
                      funds will be released automatically.
                    </Text>
                  </div>
                </div>
              </Section>
            )}

            <Section className="my-8 text-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold no-underline text-center py-4 px-8 border border-solid border-indigo-600 rounded-lg"
                href={link}
              >
                View Full Report
              </Button>
            </Section>

            <Section className="mb-8">
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center">
                {isPassed
                  ? 'If you believe the verification is incorrect, you can file a dispute within the dispute window.'
                  : 'The payee can resubmit the deliverable with corrections addressing the feedback.'}
              </Text>
            </Section>

            <Section className="text-center">
              <TopFooter />
            </Section>
            <Section className="text-center">
              <MarqueeBufi />
            </Section>
          </Container>
          <Footer />
        </BodyGradient>
      </Tailwind>
    </Html>
  );
};

export default ContractVerificationResultEmail;
```

**Step 2: Add export + subpath**

**Step 3: Commit**

```bash
git add packages/email/emails/contract-verification-result.tsx packages/email/index.ts packages/email/package.json
git commit -m "feat(email): add AI verification result email template"
```

---

### Task 7: Dispute Resolution Email

**Files:**
- Create: `packages/email/emails/contract-dispute-resolved.tsx`
- Modify: `packages/email/index.ts`
- Modify: `packages/email/package.json`

**Step 1: Create the template**

```tsx
import {
  Button,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { Footer } from '../components/footer';
import { SpookyLogo } from '../components/spooky-logo';
import { FontPoppins } from '../components/font';
import { TopFooter } from '../components/top-footer';
import { BodyGradient } from '../components/body-gradient';
import { Container } from '../components/container';
import { MarqueeBufi } from '../components/marquee';

interface Props {
  recipientName: string;
  contractTitle: string;
  milestoneTitle: string;
  finalVerdict: 'APPROVE' | 'DENY' | 'PARTIAL';
  /** Percentage of milestone amount awarded to payee (0-100) */
  payeePercentage: number;
  milestoneAmount: string;
  currency: string;
  arbitrationLayer: string;
  summary: string;
  canAppeal: boolean;
  link: string;
}

export const ContractDisputeResolvedEmail = ({
  recipientName = 'User',
  contractTitle = 'Website Redesign',
  milestoneTitle = 'Design Mockups',
  finalVerdict = 'APPROVE',
  payeePercentage = 100,
  milestoneAmount = '1,500.00',
  currency = 'USDC',
  arbitrationLayer = 'Tribunal (Layer 3)',
  summary = 'The tribunal ruled in favor of the payee. Deliverables meet acceptance criteria.',
  canAppeal = true,
  link = 'https://desk.bu.finance/contracts/abc123/dispute/1',
}: Props) => {
  const verdictLabel =
    finalVerdict === 'APPROVE' ? 'Approved (Payee Wins)' :
    finalVerdict === 'DENY' ? 'Denied (Payer Wins)' :
    `Partial (${payeePercentage}% to Payee)`;
  const verdictColor =
    finalVerdict === 'APPROVE' ? 'bg-green-600' :
    finalVerdict === 'DENY' ? 'bg-red-600' :
    'bg-orange-600';
  const text = `Dispute resolved: ${verdictLabel} — ${milestoneTitle}`;

  return (
    <Html>
      <Preview>{text}</Preview>
      <Tailwind>
        <Head>
          <FontPoppins />
        </Head>
        <BodyGradient>
          <Container>
            <Section className="text-center justify-center">
              <SpookyLogo />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-indigo-600 text-center">
              Dispute Resolved
            </Heading>

            <Text className="px-6 text-[14px] leading-[24px] text-indigo-600 text-center mb-8">
              Hi {recipientName}, the arbitration for "{milestoneTitle}" in "{contractTitle}" has concluded.
            </Text>

            <Section className="mb-6">
              <div className="w-full max-w-md mx-auto">
                <Heading as="h2" className="text-indigo-600 font-bold text-lg mb-4 text-center">
                  Arbitration Decision
                </Heading>

                <div className="bg-purple-100 rounded-2xl p-6">
                  <div className="space-y-6">
                    <Section>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Final Verdict
                      </Text>
                      <Section>
                        <div className="flex justify-center">
                          <div className={`${verdictColor} text-white px-4 py-2 rounded-full text-sm font-bold`}>
                            {verdictLabel}
                          </div>
                        </div>
                      </Section>
                    </Section>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Milestone Amount
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-2xl font-bold">
                          ${milestoneAmount} {currency}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Decided By
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm font-bold">
                          {arbitrationLayer}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Summary
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm">
                          {summary}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section className="my-8 text-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold no-underline text-center py-4 px-8 border border-solid border-indigo-600 rounded-lg"
                href={link}
              >
                View Full Decision
              </Button>
            </Section>

            {canAppeal && (
              <Section className="mb-4">
                <div className="w-full max-w-md mx-auto">
                  <div className="bg-blue-50 border-blue-200 rounded-lg p-4 border">
                    <Text className="px-6 text-indigo-600 text-sm text-center">
                      You have 48 hours to appeal this decision to the Supreme Court (Layer 4).
                      The Supreme Court's decision is final and cannot be appealed.
                    </Text>
                  </div>
                </div>
              </Section>
            )}

            <Section className="mb-8">
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center">
                All arbitration documents are cryptographically hashed and stored for audit purposes.
              </Text>
            </Section>

            <Section className="text-center">
              <TopFooter />
            </Section>
            <Section className="text-center">
              <MarqueeBufi />
            </Section>
          </Container>
          <Footer />
        </BodyGradient>
      </Tailwind>
    </Html>
  );
};

export default ContractDisputeResolvedEmail;
```

**Step 2: Add export + subpath**

**Step 3: Commit**

```bash
git add packages/email/emails/contract-dispute-resolved.tsx packages/email/index.ts packages/email/package.json
git commit -m "feat(email): add dispute resolution email template"
```

---

### Task 8: Contract Completed Email

**Files:**
- Create: `packages/email/emails/contract-completed.tsx`
- Modify: `packages/email/index.ts`
- Modify: `packages/email/package.json`

**Step 1: Create the template**

```tsx
import {
  Button,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { getAppUrl } from '@bu/env/app';
import { Footer } from '../components/footer';
import { SpookyLogo } from '../components/spooky-logo';
import { FontPoppins } from '../components/font';
import { TopFooter } from '../components/top-footer';
import { BodyGradient } from '../components/body-gradient';
import { Container } from '../components/container';
import { MarqueeBufi } from '../components/marquee';
import { Badge } from '../components/badge';

interface Props {
  recipientName: string;
  contractTitle: string;
  totalAmount: string;
  totalReleased: string;
  currency: string;
  milestoneCount: number;
  payerName: string;
  payeeName: string;
  completedAt: string;
  link: string;
}

const baseUrl = getAppUrl() ? `https://${getAppUrl()}` : '';

export const ContractCompletedEmail = ({
  recipientName = 'User',
  contractTitle = 'Website Redesign',
  totalAmount = '5,000.00',
  totalReleased = '5,000.00',
  currency = 'USDC',
  milestoneCount = 3,
  payerName = 'Acme Corp',
  payeeName = 'Jane Developer',
  completedAt = 'March 15, 2026',
  link = 'https://desk.bu.finance/contracts/abc123',
}: Props) => {
  const text = `Contract "${contractTitle}" completed — all milestones delivered`;

  return (
    <Html>
      <Preview>{text}</Preview>
      <Tailwind>
        <Head>
          <FontPoppins />
        </Head>
        <BodyGradient>
          <Container>
            <Section className="text-center justify-center">
              <SpookyLogo />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-indigo-600 text-center">
              Contract Completed
            </Heading>

            <Text className="px-6 text-[14px] leading-[24px] text-indigo-600 text-center mb-8">
              Hi {recipientName}, all milestones have been delivered and verified.
              The contract is now complete.
            </Text>

            <Section className="mb-6">
              <div className="w-full max-w-md mx-auto">
                <Heading as="h2" className="text-indigo-600 font-bold text-lg mb-4 text-center">
                  Final Summary
                </Heading>

                <div className="bg-purple-100 rounded-2xl p-6">
                  <div className="space-y-6">
                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Contract
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-base font-bold">
                          {contractTitle}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Total Released
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-2xl font-bold">
                          ${totalReleased} {currency}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Status
                      </Text>
                      <Badge>Completed</Badge>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Milestones Delivered
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm font-bold">
                          {milestoneCount} of {milestoneCount}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Parties
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm">
                          {payerName} — {payeeName}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text className="px-6 text-indigo-600 text-sm font-bold mb-2 text-center">
                        Completed
                      </Text>
                      <div className="text-center">
                        <Text className="px-6 text-indigo-600 text-sm font-bold">{completedAt}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section className="my-8 text-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold no-underline text-center py-4 px-8 border border-solid border-indigo-600 rounded-lg"
                href={link}
              >
                View Receipt & Audit Trail
              </Button>
            </Section>

            <Section className="mb-8">
              <Text className="px-6 text-[12px] leading-[20px] text-[#666666] text-center">
                A full audit trail including all verification reports, arbitration documents,
                and on-chain settlement records is available in your dashboard.
              </Text>
            </Section>

            <Section className="text-center">
              <TopFooter />
            </Section>
            <Section className="text-center">
              <MarqueeBufi />
            </Section>
          </Container>
          <Footer />
        </BodyGradient>
      </Tailwind>
    </Html>
  );
};

export default ContractCompletedEmail;
```

**Step 2: Add export + subpath**

**Step 3: Commit**

```bash
git add packages/email/emails/contract-completed.tsx packages/email/index.ts packages/email/package.json
git commit -m "feat(email): add contract completed email template"
```

---

### Task 9: Register all exports and verify build

**Files:**
- Modify: `packages/email/index.ts` (verify all 8 templates exported)
- Modify: `packages/email/package.json` (verify all 8 subpath exports)

**Step 1: Verify `index.ts` has all contract email exports**

The final block should look like:

```typescript
// Contract Lifecycle
export { ContractInvitationEmail } from './emails/contract-invitation';
export { ContractSignedEmail } from './emails/contract-signed';
export { ContractFundedEmail } from './emails/contract-funded';
export { ContractSigningReminderEmail } from './emails/contract-signing-reminder';
export { ContractDeliverableSubmittedEmail } from './emails/contract-deliverable-submitted';
export { ContractVerificationResultEmail } from './emails/contract-verification-result';
export { ContractDisputeResolvedEmail } from './emails/contract-dispute-resolved';
export { ContractCompletedEmail } from './emails/contract-completed';
```

**Step 2: Verify `package.json` has all 8 subpath exports**

```json
"./contract-invitation": {
  "types": "./dist/emails/contract-invitation.d.ts",
  "default": "./dist/emails/contract-invitation.js"
},
"./contract-signed": {
  "types": "./dist/emails/contract-signed.d.ts",
  "default": "./dist/emails/contract-signed.js"
},
"./contract-funded": {
  "types": "./dist/emails/contract-funded.d.ts",
  "default": "./dist/emails/contract-funded.js"
},
"./contract-signing-reminder": {
  "types": "./dist/emails/contract-signing-reminder.d.ts",
  "default": "./dist/emails/contract-signing-reminder.js"
},
"./contract-deliverable-submitted": {
  "types": "./dist/emails/contract-deliverable-submitted.d.ts",
  "default": "./dist/emails/contract-deliverable-submitted.js"
},
"./contract-verification-result": {
  "types": "./dist/emails/contract-verification-result.d.ts",
  "default": "./dist/emails/contract-verification-result.js"
},
"./contract-dispute-resolved": {
  "types": "./dist/emails/contract-dispute-resolved.d.ts",
  "default": "./dist/emails/contract-dispute-resolved.js"
},
"./contract-completed": {
  "types": "./dist/emails/contract-completed.d.ts",
  "default": "./dist/emails/contract-completed.js"
}
```

**Step 3: Build**

```bash
npx turbo run build --filter=@bu/email --force
```

Expected: All tasks successful, 0 errors.

**Step 4: Preview (optional)**

```bash
cd packages/email && bun run dev
```

Open `http://localhost:3003` to see all templates rendered.

**Step 5: Commit**

```bash
git add packages/email/index.ts packages/email/package.json
git commit -m "feat(email): register all 8 contract email template exports"
```

---

### Task 10: Delete IPFS artifact stub

**Files:**
- Modify: `packages/contracts/src/artifacts/storage.ts`

**Step 1: Remove the IPFS stub function**

Find `createIPFSArtifactStore` and delete it entirely. This was a stub that stored arbitration documents publicly — we use Supabase Storage exclusively for confidential documents.

**Step 2: Remove any IPFS imports or references**

**Step 3: Commit**

```bash
git add packages/contracts/src/artifacts/storage.ts
git commit -m "chore(contracts): remove IPFS artifact stub — Supabase Storage is the solution"
```

---

## Execution Order

1. Tasks 1-8 are independent (each email template) — can be parallelized
2. Task 9 depends on all 8 templates being created
3. Task 10 is independent

## Already Done (this session)

- [x] Ghost Mode multichain bridge (Tasks 1-5 from previous plan)
- [x] eUSDCg in wallet currency selector
- [x] Contract builder runtime fixes (savedContracts, missingNodeTypes, ThemeToggle, use-platform)
