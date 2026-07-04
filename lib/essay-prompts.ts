export interface EssayPrompt {
  id: string;
  taskType: "T1" | "T2";
  title: string;
  prompt: string;
  data?: { headers: string[]; rows: string[][] };
  timeLimitMin: number;
  minWords: number;
}

export const ESSAY_PROMPTS: EssayPrompt[] = [
  {
    id: "t1-transport",
    taskType: "T1",
    title: "通勤方式变化",
    prompt:
      "The table below shows the percentage of commuters using different modes of transport in a city in 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    data: {
      headers: ["Mode", "2000", "2020"],
      rows: [
        ["Private car", "48%", "31%"],
        ["Bus", "27%", "22%"],
        ["Bicycle", "9%", "24%"],
        ["Underground/Metro", "12%", "19%"],
        ["Walking", "4%", "4%"],
      ],
    },
    timeLimitMin: 20,
    minWords: 150,
  },
  {
    id: "t1-energy",
    taskType: "T1",
    title: "能源消耗结构",
    prompt:
      "The chart below shows the proportion of energy consumption by source in a country in 1990 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    data: {
      headers: ["Source", "1990", "2020"],
      rows: [
        ["Coal", "45%", "12%"],
        ["Oil & gas", "35%", "30%"],
        ["Nuclear", "10%", "13%"],
        ["Renewables", "5%", "38%"],
        ["Other", "5%", "7%"],
      ],
    },
    timeLimitMin: 20,
    minWords: 150,
  },
  {
    id: "t1-education",
    taskType: "T1",
    title: "高等教育入学率",
    prompt:
      "The table below shows the percentage of school leavers entering university in four countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    data: {
      headers: ["Country", "2000", "2010", "2020"],
      rows: [
        ["Country A", "35%", "42%", "58%"],
        ["Country B", "20%", "28%", "33%"],
        ["Country C", "55%", "60%", "65%"],
        ["Country D", "15%", "24%", "40%"],
      ],
    },
    timeLimitMin: 20,
    minWords: 150,
  },
  {
    id: "t2-technology-jobs",
    taskType: "T2",
    title: "科技与就业",
    prompt:
      "Some people believe that automation and artificial intelligence will eliminate more jobs than they create, while others think new technology will ultimately generate more employment opportunities. Discuss both views and give your own opinion.",
    timeLimitMin: 40,
    minWords: 250,
  },
  {
    id: "t2-environment-individual",
    taskType: "T2",
    title: "环境保护的责任",
    prompt:
      "Some people think that governments should be responsible for solving environmental problems, while others believe individuals should take more responsibility. Discuss both views and give your own opinion.",
    timeLimitMin: 40,
    minWords: 250,
  },
  {
    id: "t2-city-vs-countryside",
    taskType: "T2",
    title: "城市生活 vs 乡村生活",
    prompt:
      "More and more young people are moving from rural areas to big cities in search of better opportunities. What are the causes of this trend? What problems does it create for both cities and rural areas?",
    timeLimitMin: 40,
    minWords: 250,
  },
  {
    id: "t2-online-education",
    taskType: "T2",
    title: "在线教育的利弊",
    prompt:
      "Online courses are becoming increasingly popular as an alternative to traditional classroom learning. Do the advantages of this trend outweigh the disadvantages?",
    timeLimitMin: 40,
    minWords: 250,
  },
  {
    id: "t2-health-lifestyle",
    taskType: "T2",
    title: "健康生活方式",
    prompt:
      "In many countries, rates of obesity and lifestyle-related illness are rising. What do you think are the causes of this problem, and what measures could be taken to address it?",
    timeLimitMin: 40,
    minWords: 250,
  },
];

export function findPromptById(id: string): EssayPrompt | undefined {
  return ESSAY_PROMPTS.find((p) => p.id === id);
}
