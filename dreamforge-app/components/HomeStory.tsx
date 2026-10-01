const SECTIONS = [
  {
    heading: 'DreamForge keeps the conversation on your account',
    paragraphs: [
      'You might want a short chat after work, or a longer one when the day was heavy. DreamForge is built so the reply stays in character and the thread is still there when you come back. The companion can pick up what you already said because the messages live with your account, not in a single disposable bubble.',
      'A static bot repeats a script. This one can change pace when you change pace. If you write in a quieter tone, the reply can sit with that. If you want something lighter, you say so. The point is a conversation that feels directed by you.',
      'The other half of the product is choice. Open a different adult profile when you want a different presence, or build one. Every character is 21 or older. The rest of this page is how chat, voice, stills, and five-second clips fit together.',
    ],
  },
  {
    heading: 'A companion for more than one mood',
    paragraphs: [
      'You do not have to keep the same tone all week. The girls grid, the anime grid, and the guys grid are separate shelves of fictional adults. Switch when you want a different voice.',
      'Girlfriend profiles are the romantic and affectionate shelf. They remember the thread, they can send a still of a scene you describe, and on a paid plan they can speak. Boyfriend profiles are the same studio with a masculine presence: steady, funny, or sharp, depending on the card you open.',
      'Illustrated profiles live on the anime shelf. The style is anime. The age is still 21 or older. When you have met the cards that are live, the builder is how you add someone who is not on the grid yet.',
    ],
  },
  {
    heading: 'You choose chat, voice, a still, or a clip',
    paragraphs: [
      'This is not only a text box. Chat is the center. Replies follow the tone of what you wrote and stay on the same conversation so the next day is not a restart.',
      'Voice is separate. Paid plans can place a call from the profile. You pick the moment. The rate is 100 Moments a minute. Free accounts see pricing instead of the call.',
      'A still is how you see the scene. Generation uses Stable Diffusion XL. Outfits and settings come from the prompt. A clip does not start from text alone. It animates the still you already made, for five seconds. That is the whole video loop: portrait first, then a short motion of that portrait.',
      'If none of the cards fit, create a character. Age starts at 21. You set look and personality, then a portrait. The first character is free.',
    ],
  },
  {
    heading: 'Build someone who matches the way you talk',
    paragraphs: [
      'The builder is the detailed path. Start with an age band at 21 or above. Then set the features you care about: complexion, eyes, hair shape, hair color, and the rest of the look steps. Personality is its own step, so a talkative character and a quiet one are not an accident.',
      'Add a voice on the paid call, and add hobbies if you want the About panel to have something specific to mention. When you finish, you have a profile you can chat with, not a form that disappears.',
      'A more specific character can spend more Moments once you start generating stills and clips. The costs stay on the pricing page: 50 for a still, 600 for a five-second clip, 500 for each character after the first. You can see the balance before you spend it.',
    ],
  },
  {
    heading: 'Plans follow the pace you pick',
    paragraphs: [
      'Start on the free plan if you want to see the product before you pay. It includes a daily message cap and no monthly Moments grant. There is no separate trial clock.',
      'When you want a paid month, the public page shows a one-month, three-month, and twelve-month presentation. Those buttons check out on the Premium Stripe price. Lite and Ultimate subscribers keep the subscription they already have, including the Moments grant on that tier.',
      'Moments cover voice, stills, and clips. If you run out, you can buy a pack. Card payments go through Stripe. The name on the statement is the DreamForge billing name.',
    ],
  },
  {
    heading: 'Support and language',
    paragraphs: [
      'Write to support@dreamforge.app and include the email on the account. The help center on this site answers the common paths: signup, Moments, chat, stills, clips, voice, and deletion. We do not run a separate ticket brand.',
      'The live interface is English. Other locales are not shipped. A companion chat can still follow the language you write in when the model can answer that way, but the menus, policies, and help articles are English.',
    ],
  },
  {
    heading: 'What people use DreamForge for',
    paragraphs: [
      'Some people want a private conversation that remembers the thread and does not judge the mood they showed up in. That is the companionship use. It is not medical care and it does not replace anyone in your life.',
      'Others use a character to draft a scene, try a line of dialogue, or keep a story consistent. The profile becomes a partner for fiction you are already writing. The still and the five-second clip are optional pictures of that scene.',
      'A smaller group is here for the pipeline itself: how a still is required before a clip, how the checker can stop a job, and how Moments are debited only after that check. Those people read the help articles and push ordinary prompts through the product.',
      'Whatever the reason, the rules stay the same. Adults 21 and older. Fictional characters. No real-person likenesses. No sexual family-role setups. No one under 21, in the account or in the image.',
    ],
  },
];

const FAQS = [
  ['What is DreamForge?', 'A browser studio for adult companion chat, still images, five-second clips of those stills, and voice on paid plans. Characters are 21 or older.'],
  ['Is it safe to put a card on file?', 'Payments go through Stripe. DreamForge does not store the full card number. The statement shows the DreamForge billing name.'],
  ['Can I change the companion?', 'Yes. Switch profiles or use the builder. Age bands start at 21. The first character is free.'],
  ['Who is it for?', 'Adults 21 and older who want a private chat, a still, or a short clip. It is not a service for minors and it is not clinical care.'],
  ['Can a companion send a picture, a clip, or a voice note?', 'Yes, as separate actions. A still is generated from the scene. A clip animates that still for five seconds. Voice is a paid call.'],
  ['Can I roleplay?', 'Yes, with fictional adults. The blocked-content rules still apply, including the age line and the ban on sexual family-role setups.'],
  ['How does a profile get to know me?', 'The conversation is saved on your account, so later messages continue the thread.'],
  ['Are chats public?', 'No. They stay on the account. You can export or delete the account.'],
  ['Do I need an app?', 'No. Use the site in a browser and sign in.'],
];

export default function HomeStory() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <h2 className="text-[22px] font-semibold mb-4">DreamForge FAQ</h2>
      <div className="space-y-3 mb-12">
        {FAQS.map(([q, a]) => (
          <details key={q} className="rounded-xl bg-[#17171a] px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold">{q}</summary>
            <p className="mt-2 text-sm leading-6 text-[#cfcfcf]">{a}</p>
          </details>
        ))}
      </div>
      {SECTIONS.map((section) => (
        <section key={section.heading} className="mb-10">
          <h2 className="text-[22px] font-semibold leading-7 mb-3">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mb-3 text-[15px] leading-7 text-[#cfcfcf]">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
