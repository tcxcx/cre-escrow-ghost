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
