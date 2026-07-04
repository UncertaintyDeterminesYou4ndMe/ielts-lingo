export interface SpeakingTopic {
  id: string;
  title: string;
  part1Questions: string[];
  part2: {
    cueCard: string;
    bulletPoints: string[];
  };
}

export const SPEAKING_TOPICS: SpeakingTopic[] = [
  {
    id: "hometown",
    title: "家乡与居住地",
    part1Questions: [
      "Let's talk about your hometown. Where is it?",
      "What do you like most about living there?",
      "Has your hometown changed much in recent years?",
    ],
    part2: {
      cueCard: "Describe a place in your hometown that you like to visit.",
      bulletPoints: [
        "where it is",
        "how often you go there",
        "what you do there",
        "and explain why you like this place",
      ],
    },
  },
  {
    id: "work-study",
    title: "工作与学习",
    part1Questions: [
      "Do you work or are you a student?",
      "What do you like most about your job or studies?",
      "What are your plans for the future?",
    ],
    part2: {
      cueCard: "Describe a skill you would like to learn.",
      bulletPoints: [
        "what the skill is",
        "why you want to learn it",
        "how you would learn it",
        "and explain how it would benefit you",
      ],
    },
  },
  {
    id: "technology",
    title: "科技与生活",
    part1Questions: [
      "How much time do you spend using your phone every day?",
      "What apps do you use most often?",
      "Do you think technology has made life easier or more complicated?",
    ],
    part2: {
      cueCard: "Describe a piece of technology you find useful.",
      bulletPoints: [
        "what it is",
        "how you use it",
        "how long you have had it",
        "and explain why it is useful to you",
      ],
    },
  },
  {
    id: "travel",
    title: "旅行与文化",
    part1Questions: [
      "Do you enjoy travelling?",
      "What was the most interesting place you have visited?",
      "Do you prefer travelling alone or with others?",
    ],
    part2: {
      cueCard: "Describe a trip you remember well.",
      bulletPoints: [
        "where you went",
        "who you went with",
        "what you did there",
        "and explain why you remember it well",
      ],
    },
  },
];

export function findTopicById(id: string): SpeakingTopic | undefined {
  return SPEAKING_TOPICS.find((t) => t.id === id);
}
