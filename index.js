// Enhanced MCP Server with TWO tools: add and multiply

let calculationHistory = [];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Home page
    if (url.pathname === '/' && request.method === 'GET') {
      return Response.json({
        message: "Hello! This is my calculator server 🧮",
        tools: ["add_numbers", "multiply_numbers"],
        version: "2.0"
      }, { headers: corsHeaders });
    }
    
    // MCP connection endpoint
    if (url.pathname === '/mcp' && request.method === 'GET') {
      const sessionId = crypto.randomUUID();
      
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          const welcome = {
            type: "connection_established",
            session_id: sessionId,
            message: "Welcome! I can add AND multiply now! 🎉"
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(welcome)}\n\n`));
          
          const interval = setInterval(() => {
            const heartbeat = { type: "heartbeat", time: new Date().toISOString() };
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
            } catch (e) {
              clearInterval(interval);
            }
          }, 30000);
          
          setTimeout(() => {
            clearInterval(interval);
            controller.close();
          }, 300000);
        }
      });
      
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Mcp-Session-Id': sessionId
        }
      });
    }
    
    // MCP request handler
    if (url.pathname === '/mcp' && request.method === 'POST') {
      try {
        const requestData = await request.json();
        const method = requestData.method;
        const params = requestData.params || {};
        const requestId = requestData.id;
        
        let result;
        
        if (method === 'tools/list') {
          result = {
            tools: [
              {
                name: "add_numbers",
                description: "Add two numbers together",
                inputSchema: {
                  type: "object",
                  properties: {
                    a: { type: "number", description: "First number" },
                    b: { type: "number", description: "Second number" }
                  },
                  required: ["a", "b"]
                }
              },
              {
                name: "multiply_numbers", 
                description: "Multiply two numbers together",
                inputSchema: {
                  type: "object",
                  properties: {
                    a: { type: "number", description: "First number" },
                    b: { type: "number", description: "Second number" }
                  },
                  required: ["a", "b"]
                }
              }
            ]
          };
        } else if (method === 'tools/call') {
          const toolName = params.name;
          const arguments = params.arguments || {};
          
          if (toolName === 'add_numbers') {
            const a = arguments.a;
            const b = arguments.b;
            const answer = a + b;
            
            calculationHistory.push({
              operation: 'add',
              a: a,
              b: b,
              result: answer,
              timestamp: new Date().toISOString()
            });
            
            result = {
              content: [
                {
                  type: "text",
                  text: `➕ ${a} + ${b} = ${answer}`
                }
              ]
            };
          } else if (toolName === 'multiply_numbers') {
            const a = arguments.a;
            const b = arguments.b;
            const answer = a * b;
            
            calculationHistory.push({
              operation: 'multiply',
              a: a,
              b: b,
              result: answer,
              timestamp: new Date().toISOString()
            });
            
            result = {
              content: [
                {
                  type: "text",
                  text: `✖️ ${a} × ${b} = ${answer}`
                }
              ]
            };
          } else {
            throw new Error(`Unknown tool: ${toolName}`);
          }
        } else {
          throw new Error(`Unknown method: ${method}`);
        }
        
        return Response.json({
          id: requestId,
          result: result
        }, { headers: corsHeaders });
        
      } catch (error) {
        return Response.json({
          id: requestData?.id,
          error: {
            code: -1,
            message: error.message
          }
        }, { 
          status: 400,
          headers: corsHeaders 
        });
      }
    }
    
    // Test endpoint
    if (url.pathname === '/test' && request.method === 'GET') {
      const addResult = { a: 5, b: 3, answer: 5 + 3 };
      const multiplyResult = { a: 4, b: 7, answer: 4 * 7 };
      
      calculationHistory.push({
        operation: 'add',
        a: addResult.a,
        b: addResult.b,
        result: addResult.answer,
        timestamp: new Date().toISOString()
      });
      
      calculationHistory.push({
        operation: 'multiply',
        a: multiplyResult.a,
        b: multiplyResult.b,
        result: multiplyResult.answer,
        timestamp: new Date().toISOString()
      });
      
      return Response.json({
        message: "Testing both tools:",
        tests: [
          {
            tool: "add_numbers",
            input: `${addResult.a} + ${addResult.b}`,
            output: addResult.answer
          },
          {
            tool: "multiply_numbers", 
            input: `${multiplyResult.a} × ${multiplyResult.b}`,
            output: multiplyResult.answer
          }
        ]
      }, { headers: corsHeaders });
    }
    
    // History endpoint
    if (url.pathname === '/history' && request.method === 'GET') {
      const stats = {
        total_calculations: calculationHistory.length,
        additions: calculationHistory.filter(calc => calc.operation === 'add').length,
        multiplications: calculationHistory.filter(calc => calc.operation === 'multiply').length
      };
      
      return Response.json({
        statistics: stats,
        recent_calculations: calculationHistory.slice(-10),
        all_calculations: calculationHistory
      }, { headers: corsHeaders });
    }
    
    // Status endpoint
    if (url.pathname === '/status' && request.method === 'GET') {
      return Response.json({
        server: "MCP Calculator Server",
        version: "2.0",
        status: "running",
        tools_available: 2,
        total_calculations: calculationHistory.length,
        uptime: "Connected"
      }, { headers: corsHeaders });
    }
    
    return new Response('Not found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
};
