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
              Contract Fully Signed
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
