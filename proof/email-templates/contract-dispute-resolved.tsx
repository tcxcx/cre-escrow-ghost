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
