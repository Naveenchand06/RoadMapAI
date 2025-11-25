"""
Python LangGraph Agent for Learning Path Generation
Subscribes to 'learning.path.requested' event from TypeScript API
Uses LangGraph + Gemini to orchestrate AI-powered curriculum generation with streaming
"""

import os
import json
from typing import Any, Dict, List, Optional
from datetime import datetime

# LangGraph imports
from langgraph.graph import StateGraph, END
# from langchain_google_genai import ChatGoogleGenerativeAI  # Commented out - using Groq instead
from langchain_groq import ChatGroq

# Motia event configuration
config = {
    "type": "event",
    "name": "LearningPathGenerator",
    "description": "Generates a learning path using LangGraph and Gemini",
    "subscribes": ["learning.path.requested"],
    "emits": ["learning.path.generated", "learning.path.failed"],
    "flows": ["RoadMapAI"]
}


class LearningPathGenerator:
    """LangGraph-based learning path generator using Groq"""
    
    def __init__(self, logger=None, streams=None, emit=None, trace_id=None):
        self.logger = logger
        self.streams = streams
        self.emit_fn = emit
        self.trace_id = trace_id
        
        # Initialize Groq model (using Groq to avoid quota issues)
        # GEMINI CODE (commented out):
        # api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
        # if not api_key:
        #     raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable not set")
        # self.llm = ChatGoogleGenerativeAI(
        #     model="gemini-3-pro-preview",
        #     google_api_key=api_key,
        #     temperature=0.3,
        #     max_output_tokens=4096
        # )
        
        # Initialize Groq model
        groq_api_key = os.environ.get('GROQ_API_KEY')
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",  # Using Llama 3.3 70B (free tier)
            groq_api_key=groq_api_key,
            temperature=0.3,
        )
        
        # Build the LangGraph
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(dict)
        
        # Add nodes for each stage
        workflow.add_node("analyze_background", self._analyze_background)
        workflow.add_node("generate_curriculum", self._generate_curriculum)
        workflow.add_node("enrich_resources", self._enrich_resources)
        workflow.add_node("finalize_path", self._finalize_path)
        
        # Define the flow
        workflow.set_entry_point("analyze_background")
        workflow.add_edge("analyze_background", "generate_curriculum")
        workflow.add_edge("generate_curriculum", "enrich_resources")
        workflow.add_edge("enrich_resources", "finalize_path")
        workflow.add_edge("finalize_path", END)
        
        return workflow.compile()
    
    async def _stream_update(self, stage: str, message: str, progress: int, data: Optional[Dict] = None):
        """Helper to stream progress updates"""
        if self.streams and self.trace_id:
            update_data = {
                'stage': stage,
                'message': message,
                'progress': progress,
                'timestamp': int(datetime.now().timestamp() * 1000)
            }
            if data:
                update_data['data'] = data
            
            await self.streams.learningPathCreation.set(self.trace_id, 'learningPath', update_data)
        
        if self.logger:
            self.logger.info(f"📊 {stage}: {message}", {'progress': progress})
    
    async def _analyze_background(self, state: Dict) -> Dict:
        """Node 1: Analyze user background and learning goals"""
        await self._stream_update(
            'analyzing',
            f'Analyzing your background for {state["topic"]}...',
            15
        )
        
        prompt = f"""You are an expert learning path designer. Analyze the following:

                        Topic: {state['topic']}
                        User Background: {state['background']}
                        Goal Level: {state['goal_level']}

                        Provide a brief analysis (2-3 sentences) of:
                        1. What the user already knows
                        2. What gaps need to be filled
                        3. Recommended learning approach

                        Return ONLY the analysis text, no extra formatting.
                """

        response = await self.llm.ainvoke([
            {"role": "system", "content": "You are an expert educational curriculum designer."},
            {"role": "user", "content": prompt}
        ])
        
        analysis = response.content.strip()
        
        if self.logger:
            self.logger.info("✅ Background analysis completed", {'topic': state['topic']})
        
        state['analysis'] = analysis
        state['progress'] = 20
        state['current_stage'] = 'analyzing'
        
        return state
    
    async def _generate_curriculum(self, state: Dict) -> Dict:
        """Node 2: Generate curriculum structure with modules"""
        await self._stream_update(
            'generating',
            f'Creating curriculum structure for {state["topic"]}...',
            40
        )
        
        prompt = f"""Create a detailed learning curriculum for the following:

Topic: {state['topic']}
User Background: {state['background']}
Goal Level: {state['goal_level']}
Analysis: {state['analysis']}

Generate a structured curriculum with 4-6 modules. For each module, include:
- Module title
- Learning objectives (2-3 points)
- Key concepts to cover
- Estimated hours
- Prerequisites (if any)

Return ONLY a valid JSON object with this structure:
{{
  "title": "Learning Path Title",
  "description": "Brief description",
  "total_hours": 30,
  "modules": [
    {{
      "order": 1,
      "title": "Module Title",
      "description": "What this module covers",
      "objectives": ["objective 1", "objective 2"],
      "key_concepts": ["concept 1", "concept 2"],
      "estimated_hours": 5,
      "prerequisites": []
    }}
  ]
}}

Return ONLY valid JSON, no markdown formatting or extra text."""

        response = await self.llm.ainvoke([
            {"role": "system", "content": "You are an expert curriculum designer. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ])
        
        # Parse JSON response
        try:
            # Remove markdown code blocks if present
            content = response.content.strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            content = content.strip()
            
            curriculum = json.loads(content)
        except json.JSONDecodeError as e:
            if self.logger:
                self.logger.error("Failed to parse curriculum JSON", {'error': str(e)})
            # Fallback to basic structure
            curriculum = {
                "title": f"Learning Path: {state['topic']}",
                "description": state['analysis'],
                "total_hours": 30,
                "modules": []
            }
        
        if self.logger:
            self.logger.info("✅ Curriculum structure generated", {
                'modules': len(curriculum.get('modules', [])),
                'topic': state['topic']
            })
        
        state['curriculum_structure'] = curriculum
        state['progress'] = 60
        state['current_stage'] = 'generating'
        
        return state
    
    async def _enrich_resources(self, state: Dict) -> Dict:
        """Node 3: Enrich modules with recommended resources"""
        await self._stream_update(
            'enriching',
            'Finding the best learning resources...',
            75
        )
        
        curriculum = state['curriculum_structure']
        preferences = state.get('preferences', {})
        
        enriched_modules = []
        
        for idx, module in enumerate(curriculum.get('modules', [])):
            # Generate resource recommendations for each module
            prompt = f"""For this learning module, recommend 3-5 high-quality resources:

Module: {module['title']}
Description: {module.get('description', '')}
Key Concepts: {', '.join(module.get('key_concepts', []))}

Preferences:
- Include Videos: {preferences.get('includeVideos', True)}
- Include Articles: {preferences.get('includeArticles', True)}
- Include Docs: {preferences.get('includeDocs', True)}

Recommend specific resources (real or realistic examples). Return ONLY valid JSON:
{{
  "resources": [
    {{
      "type": "video|article|documentation",
      "title": "Resource Title",
      "description": "Brief description",
      "url": "https://example.com",
      "duration": "30 min" or "10 min read",
      "difficulty": "beginner|intermediate|advanced"
    }}
  ]
}}

Return ONLY valid JSON, no extra text."""

            response = await self.llm.ainvoke([
                {"role": "system", "content": "You are a resource curator. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ])
            
            try:
                content = response.content.strip()
                if content.startswith('```'):
                    content = content.split('```')[1]
                    if content.startswith('json'):
                        content = content[4:]
                content = content.strip()
                
                resources_data = json.loads(content)
                module['resources'] = resources_data.get('resources', [])
            except json.JSONDecodeError:
                module['resources'] = []
            
            enriched_modules.append(module)
            
            # Update progress
            progress = 75 + int((idx + 1) / len(curriculum.get('modules', [])) * 15)
            await self._stream_update(
                'enriching',
                f'Enriched module {idx + 1}/{len(curriculum.get("modules", []))}',
                progress
            )
        
        if self.logger:
            self.logger.info("✅ Resources enriched", {
                'modules': len(enriched_modules),
                'topic': state['topic']
            })
        
        state['enriched_modules'] = enriched_modules
        state['progress'] = 90
        state['current_stage'] = 'enriching'
        
        return state
    
    async def _finalize_path(self, state: Dict) -> Dict:
        """Node 4: Finalize the learning path"""
        await self._stream_update(
            'completed',
            f'Your {state["topic"]} learning path is ready! 🎉',
            100
        )
        
        curriculum = state['curriculum_structure']
        curriculum['modules'] = state['enriched_modules']
        
        final_path = {
            'userId': state['user_id'],
            'topic': state['topic'],
            'background': state['background'],  
            'goalLevel': state['goal_level'],
            'preferences': state.get('preferences', {}),
            'analysis': state['analysis'],
            'curriculum': curriculum,
            'createdAt': datetime.now().isoformat(),
            'traceId': state['trace_id']
        }
        
        if self.logger:
            self.logger.info("🎉 Learning path finalized", {
                'topic': state['topic'],
                'modules': len(curriculum.get('modules', []))
            })
        
        state['final_path'] = final_path
        state['progress'] = 100
        state['current_stage'] = 'completed'
        
        return state
    
    async def generate(self, req: Dict) -> Dict:
        """Run the LangGraph to generate a learning path"""
        # Initialize state
        initial_state = {
            'user_id': req.get('userId'),
            'topic': req.get('topic'),
            'background': req.get('background'),
            'goal_level': req.get('goalLevel', 'intermediate'),
            'preferences': req.get('preferences', {}),
            'trace_id': req.get('traceId'),
            'analysis': None,
            'curriculum_structure': None,
            'enriched_modules': None,
            'final_path': None,
            'progress': 0,
            'current_stage': 'analyzing',
            'error': None
        }
        
        # Run the graph
        final_state = await self.graph.ainvoke(initial_state)
        
        return final_state['final_path']


async def handler(req, ctx=None):
    """
    Main handler that processes learning path requests using LangGraph + Groq
    
    Flow:
    1. Receive event from TypeScript API
    2. Initialize LangGraph generator
    3. Stream progress updates during generation
    4. Emit completion event
    """
    
    logger = getattr(ctx, 'logger', None) if ctx else None
    emit = getattr(ctx, 'emit', None) if ctx else None
    streams = getattr(ctx, 'streams', None) if ctx else None
    # Prefer traceId from the event payload as that's what the client has
    trace_id = req.get('traceId') or getattr(ctx, 'traceId', None)
    
    # Extract data from event
    user_id = req.get('userId')
    topic = req.get('topic')
    background = req.get('background')
    goal_level = req.get('goalLevel', 'intermediate')
    preferences = req.get('preferences', {})
    
    if logger:
        logger.info('🤖 LangGraph Agent activated', {
            'userId': user_id,
            'topic': topic,
            'goalLevel': goal_level,
            'traceId': trace_id
        })
    
    try:
        # Initialize LangGraph generator
        generator = LearningPathGenerator(
            logger=logger,
            streams=streams,
            emit=emit,
            trace_id=trace_id
        )
        
        # Generate learning path
        learning_path = await generator.generate(req)
        
        # Emit completion event
        if emit:
            await emit({
                'topic': 'learning.path.generated',
                'data': {
                    'userId': user_id,
                    'topic': topic,
                    'learningPath': learning_path,
                    'traceId': trace_id,
                    'completedAt': int(datetime.now().timestamp() * 1000)
                }
            })
        
        if logger:
            logger.info('🎉 Learning path generation completed successfully', {
                'topic': topic,
                'traceId': trace_id
            })
    
    except Exception as error:
        if logger:
            logger.error('❌ Learning path generation failed', {
                'userId': user_id,
                'topic': topic,
                'error': str(error),
                'traceId': trace_id
            })
        
        # Stream error
        if streams and trace_id:
            await streams.learningPathCreation.set(trace_id, 'learningPath', {
                'stage': 'error',
                'message': f'Failed to generate learning path: {str(error)}',
                'progress': 0,
                'timestamp': int(datetime.now().timestamp() * 1000)
            })
        
        # Emit failure event
        if emit:
            await emit({
                'topic': 'learning.path.failed',
                'data': {
                    'userId': user_id,
                    'topic': topic,
                    'error': str(error),
                    'traceId': trace_id
                }
            })