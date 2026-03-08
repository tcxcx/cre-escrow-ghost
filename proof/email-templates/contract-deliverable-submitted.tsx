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
