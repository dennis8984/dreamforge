import type { DocSection } from '@/components/DocFrame';

export interface PolicyDoc {
  slug: string;
  title: string;
  description: string;
  lede: string;
  sections: DocSection[];
}

const support = 'Questions about these terms go to support@dreamforge.app.';

export const POLICIES: PolicyDoc[] = [
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    description: 'The agreement for using DreamForge chat, stills, clips, and voice.',
    lede: 'These terms cover the DreamForge companion product: text chat, still images, five-second clips made from those stills, and voice. They apply when you create an account or use the site while signed out of a paid feature.',
    sections: [
      {
        heading: 'Who can use DreamForge',
        paragraphs: [
          'DreamForge is for adults who are 21 or older. If you are under 21, do not create an account, do not start a chat, and do not generate images or clips. We may close an account when we cannot confirm that age.',
          'You need one account that is yours. Do not share the login, do not buy or sell accounts, and do not use the product on behalf of someone who is not allowed to be here.',
        ],
      },
      {
        heading: 'The product',
        paragraphs: [
          'Chat is a conversation with a companion. A still is an image made from a prompt. A clip is a short animation of a still you already have, fixed at about five seconds. Voice is a separate call or spoken reply, billed by time when that feature is on your plan.',
          'Free accounts have a daily message cap. Paid plans raise that cap and add a monthly Moments balance. Moments are spent on stills, clips, voice, and extra characters. Unused Moments do not become cash.',
        ],
      },
      {
        heading: 'Plans and payments',
        paragraphs: [
          'The public pricing page shows one-month, three-month, and twelve-month terms. Checkout charges the Premium price already configured in Stripe. Lite and Ultimate subscribers keep the plan they already pay for.',
          'Card payments run through Stripe. The name on your statement is the billing name on the DreamForge Stripe account. You can cancel future renewals from the billing portal. A period you already paid for runs until it ends unless a law where you live requires a refund.',
        ],
      },
      {
        heading: 'Your prompts and our output',
        paragraphs: [
          'You keep the rights you already have in text you type. You give DreamForge permission to process that text so we can run the chat, the still, the clip, and the safety check. Generated stills and clips are synthetic. They are not photographs of a real sitting.',
          'Do not upload a photo of someone else unless you have the right to use it as a source still. Do not ask for a real person’s likeness. Do not use the product to make material that breaks the blocked-content policy.',
        ],
      },
      {
        heading: 'Stopping the service',
        paragraphs: [
          'You may delete your account from the account tools. We may suspend or close an account that breaks these terms, the community guidelines, or the age rule. When an account closes, chats and media tied to it are removed on the schedule in the privacy notice.',
          support,
        ],
      },
    ],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Notice',
    description: 'What DreamForge stores about your account, chats, and payments.',
    lede: 'This notice explains what DreamForge stores when you use chat, stills, clips, and voice, and the choices you have over that information.',
    sections: [
      {
        heading: 'Account data',
        paragraphs: [
          'When you register we store the email address and the authentication record from the sign-in provider. We also store your plan name, your Moments balance, and the characters you create or open.',
          'We do not sell that account file. We use it to sign you in, to apply the daily message cap, and to debit Moments when you generate a still, a clip, or a voice minute.',
        ],
      },
      {
        heading: 'Chats and media',
        paragraphs: [
          'Messages you send and replies you receive are stored with the conversation so you can reopen it. When an encryption key is configured, message text is encrypted before it is written. Stills and clips are stored as files linked to the character or the job that made them.',
          'Prompts are also sent to the safety check before a still or clip job is queued. If the checker is unavailable, the job does not run. We keep the result of that check with the job so we can explain a refusal.',
        ],
      },
      {
        heading: 'Payments',
        paragraphs: [
          'Card numbers are handled by Stripe. DreamForge receives the payment status, the plan, and a customer reference. We do not store a full card number on our own servers.',
        ],
      },
      {
        heading: 'Your choices',
        paragraphs: [
          'You can export your data and you can delete the account. Deletion removes the profile, the conversations, and the media we can still reach. Backups roll off on their normal cycle.',
          'Write to support@dreamforge.app for a privacy request. Include the email on the account so we can find the right record.',
        ],
      },
    ],
  },
  {
    slug: 'cookies-policy',
    title: 'Cookies Notice',
    description: 'The cookies DreamForge uses to keep you signed in.',
    lede: 'DreamForge uses a small set of cookies and local storage so the session survives a refresh and so you can dismiss the consent banner.',
    sections: [
      {
        heading: 'What we store in the browser',
        paragraphs: [
          'The sign-in client keeps an access token in local storage so API calls can include it. A consent cookie remembers that you closed the banner. These are required for the signed-in product to work.',
          'We do not use that storage to build an advertising profile, and we do not drop third-party ad cookies on the companion pages.',
        ],
      },
      {
        heading: 'How to clear them',
        paragraphs: [
          'You can clear site data in the browser. Doing that signs you out. The consent banner will show again on the next visit.',
        ],
      },
    ],
  },
  {
    slug: 'underage-policy',
    title: 'Underage Policy',
    description: 'DreamForge is limited to adults who are 21 or older.',
    lede: 'DreamForge does not allow anyone under 21 to use the product, and it does not allow characters, prompts, or images that depict anyone under 21.',
    sections: [
      {
        heading: 'The age line',
        paragraphs: [
          'Accounts are for people 21 and older. The character builder starts age ranges at 21. Profiles and cards that show an age under 21 are not part of this product. If a prompt, a still, or a chat asks for a minor, the job is refused.',
          'School-age settings and any sexual or romantic framing of a minor are blocked. That includes characters described as students in a school context.',
        ],
      },
      {
        heading: 'What we do when we see it',
        paragraphs: [
          'We remove the content, we stop the job, and we may close the account. We report child sexual abuse material to the appropriate authority. Do not test this rule.',
          'If you believe an account or a file breaks this policy, write to support@dreamforge.app with the page address.',
        ],
      },
    ],
  },
  {
    slug: 'content-removal-policy',
    title: 'Content Removal Policy',
    description: 'How to ask DreamForge to remove a still, a clip, or a profile.',
    lede: 'You can ask us to remove a still, a clip, or a profile that should not be on DreamForge. This page explains what to send and what happens next.',
    sections: [
      {
        heading: 'What you can ask us to remove',
        paragraphs: [
          'Ask for removal when a file uses your likeness without permission, when it includes your private information, or when it breaks the blocked-content policy. Also write if you uploaded something by mistake and cannot delete it from the account tools.',
          'Include the page address, a short description, and whether you are the person in the image or the account holder. If you are writing about your own account, use the email on that account.',
        ],
      },
      {
        heading: 'What we do',
        paragraphs: [
          'We review the request, we remove files that violate the rules, and we reply when we can match the request to a record. We do not remove a file only because someone dislikes a fictional adult character that does not depict them.',
          'Send requests to support@dreamforge.app. For copyright, use the DMCA page so the notice has the statements that process requires.',
        ],
      },
    ],
  },
  {
    slug: 'blocked-content-policy',
    title: 'Blocked Content Policy',
    description: 'Prompts and files DreamForge will not generate or host.',
    lede: 'Some requests never become a still or a clip. The checker runs before Moments are spent on the job. If the checker is down, the job does not start.',
    sections: [
      {
        heading: 'Always blocked',
        paragraphs: [
          'We block sexual or romantic content involving anyone under 21, and any character presented as a minor. We block real-person likenesses, including public figures, when the prompt is trying to depict that person. We block non-consensual sexual content, including deepfakes of a real person.',
          'We also block sexual content built on family roles. That includes step-family, parent, sibling, and similar setups. The builder does not offer those relationship labels, and the shorts shelf does not use those categories.',
        ],
      },
      {
        heading: 'Other refusals',
        paragraphs: [
          'We refuse prompts that ask for extreme harm, sexual violence, or instructions for a real-world crime. A refusal returns an error instead of a file. Moments are not debited when the checker stops the job before the queue.',
          'Repeating a blocked prompt can close the account. If a file that should have been blocked is live, use the content removal page.',
        ],
      },
    ],
  },
  {
    slug: 'dmca-policy',
    title: 'DMCA Policy',
    description: 'How to send a copyright notice to DreamForge.',
    lede: 'If you believe a file on DreamForge copies your copyrighted work, send a notice that includes the items below. We respond to complete notices.',
    sections: [
      {
        heading: 'What to include',
        paragraphs: [
          'Send your name, your email, the address of the file, a description of the work you own, and a statement that you believe the use is not authorized. Also include a statement that the notice is accurate and that you are the owner or the owner’s agent, plus your physical or electronic signature.',
          'Send the notice to support@dreamforge.app with the subject line DMCA. Incomplete notices are returned so you can add the missing piece.',
        ],
      },
      {
        heading: 'Counter notice',
        paragraphs: [
          'If your file was removed and you believe that was a mistake, you may send a counter notice with your contact details, the address that was removed, a statement under penalty of perjury that the removal was a mistake, and consent to the court where you live. We restore a file only when the process allows it.',
        ],
      },
    ],
  },
  {
    slug: 'complaint-policy',
    title: 'Complaint Policy',
    description: 'How to complain about an account, a charge, or a file.',
    lede: 'Use this path when something on DreamForge went wrong and the help articles did not fix it. Billing disputes for a card charge also start with your receipt.',
    sections: [
      {
        heading: 'How to write',
        paragraphs: [
          'Email support@dreamforge.app with the account email, the page or charge you mean, and what you want changed. For a safety issue, say so in the subject so it is read first.',
          'We answer in the order requests arrive. A missing account email is the usual reason a reply stalls. If the charge is on a card, you can also open the Stripe receipt from the billing portal.',
        ],
      },
      {
        heading: 'What we will not do',
        paragraphs: [
          'We do not adjudicate a private disagreement between two people that did not happen on the product. We do not restore Moments that were spent on a completed still or clip you chose to generate.',
        ],
      },
    ],
  },
  {
    slug: 'usc-2257-exemption',
    title: '18 U.S.C. 2257 Exemption',
    description: 'DreamForge characters are fictional adults. Stills and clips are generated.',
    lede: 'DreamForge does not photograph live performers for the companion catalog. Profiles, stills, and clips are generated depictions of fictional adults who are 21 or older.',
    sections: [
      {
        heading: 'What this catalog is',
        paragraphs: [
          'The people you see on DreamForge cards are not records of a real photoshoot. A still is produced by the image model from a prompt. A clip is a short animation of that still. There is no performer record because there is no live performer in that file.',
          'The product refuses prompts that ask for anyone under 21. The builder does not offer an age under 21. This notice is the product description of that pipeline. It is not a statement that every upload a user might attempt is lawful.',
        ],
      },
      {
        heading: 'Questions',
        paragraphs: [
          'Write to support@dreamforge.app if you need to know whether a specific file was generated by the product or uploaded. Uploads that depict a real person are covered by the blocked-content and removal policies.',
        ],
      },
    ],
  },
  {
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    description: 'How to treat other people and the companions on DreamForge.',
    lede: 'DreamForge is a private studio, not a public social network, but chats, reports, and shared galleries still have rules. These guidelines sit next to the terms.',
    sections: [
      {
        heading: 'Adults only',
        paragraphs: [
          'Everyone here is 21 or older, and every character is written that way. Do not steer a chat, a still, or a clip toward a minor. Do not joke your way around the age line.',
        ],
      },
      {
        heading: 'No real people, no family setups',
        paragraphs: [
          'Do not prompt a real person’s face or name. Do not build a sexual scene around family roles, including step relationships. Original adult characters are the catalog.',
          'If you report a file, describe the page and what rule it breaks. Do not use the report form to harass someone.',
        ],
      },
      {
        heading: 'Your account',
        paragraphs: [
          'One person, one account. Do not try to get around a ban with a new email. Staff may close an account that treats the checker as something to defeat.',
        ],
      },
    ],
  },
  {
    slug: 'affiliate-terms',
    title: 'Affiliate Terms',
    description: 'DreamForge does not have an open affiliate program.',
    lede: 'There is no live DreamForge affiliate offer. These terms explain that, so a form or a link elsewhere does not create a commission.',
    sections: [
      {
        heading: 'No open program',
        paragraphs: [
          'DreamForge is not paying commissions for referrals, and it is not accepting affiliate applications. A third-party form, a social post, or a code you invent does not enroll you.',
          'If a program opens later, it will be published on this site with its own rates, tracking, and prohibited claims. Until that page says the program is open, no fee is owed.',
        ],
      },
      {
        heading: 'Claims you cannot make',
        paragraphs: [
          'Do not advertise DreamForge with someone else’s brand name, someone else’s photos, or a promise we do not make, including a guarantee about income. Do not imply that you are the company.',
        ],
      },
    ],
  },
];

export function getPolicy(slug: string) {
  return POLICIES.find((policy) => policy.slug === slug);
}
