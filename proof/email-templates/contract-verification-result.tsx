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
