import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  message: string;
  topicName: string;
  chatType: 'doubt' | 'concept_explainer';
}

const generateDoubtResponse = (message: string, topicName: string): string => {
  const responses = [
    `Great question about ${topicName}! Let me help you understand this better.\n\n${message}\n\nThis is a common area where students need clarification. Here's a detailed explanation:\n\n1. The fundamental concept involves understanding the core principles that govern this topic.\n2. When applying this in practice, remember to break down the problem into smaller, manageable parts.\n3. Practice is key - try working through similar examples to solidify your understanding.\n\nWould you like me to explain any specific part in more detail?`,

    `Excellent question regarding ${topicName}! I can see why this might be confusing.\n\nLet me break this down for you:\n\n• First, consider the foundational concepts that build up to this topic.\n• Next, think about how these concepts interconnect and influence each other.\n• Finally, apply these principles to solve practical problems.\n\nRemember: Understanding the 'why' is just as important as knowing the 'how'. Keep asking questions!`,

    `That's an insightful question about ${topicName}!\n\nHere's what you need to know:\n\nThe key to understanding this lies in grasping the underlying principles. Think of it like building blocks - each concept builds upon the previous one.\n\nPractical Application:\n- Start with the basics and ensure you have a solid foundation\n- Progress to more complex scenarios gradually\n- Practice regularly to reinforce your understanding\n\nFeel free to ask follow-up questions if anything is unclear!`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};

const generateConceptExplanation = (concept: string, topicName: string): string => {
  return `# Understanding ${concept} in ${topicName}

## Overview
${concept} is a fundamental concept in ${topicName} that plays a crucial role in understanding the subject as a whole. This concept forms the foundation for many advanced topics and practical applications.

## Key Components

- **Definition**: ${concept} refers to the systematic approach and principles that govern this particular aspect of ${topicName}.

- **Importance**: Understanding this concept is essential because it:
  - Provides a framework for solving complex problems
  - Connects theoretical knowledge with practical applications
  - Serves as a building block for more advanced topics

- **Core Principles**: The main ideas behind ${concept} include:
  - Logical organization of information and processes
  - Systematic approach to problem-solving
  - Integration with related concepts in ${topicName}

## Practical Application
When working with ${concept}, remember to:
1. Start with the fundamental definitions and properties
2. Practice with simple examples before moving to complex ones
3. Connect the concept to real-world scenarios
4. Review and reinforce regularly

## Common Misconceptions
Students often confuse certain aspects of ${concept}. Make sure you understand the distinctions and practice regularly to avoid common pitfalls.

## Next Steps
- Practice problems related to ${concept}
- Review related concepts in ${topicName}
- Apply the concept in different scenarios
- Discuss with peers or instructors for deeper understanding

Would you like me to elaborate on any specific aspect of ${concept}?`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, topicName, chatType }: RequestBody = await req.json();

    if (!message || !topicName || !chatType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let aiResponse: string;

    if (chatType === 'concept_explainer') {
      aiResponse = generateConceptExplanation(message, topicName);
    } else {
      aiResponse = generateDoubtResponse(message, topicName);
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in AI assistant:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
