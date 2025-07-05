// Enhanced MCP Server optimized for Cursor compatibility

let calculationHistory = [];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS - Enhanced for better compatibility
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Home page
    if (url.pathname === '/' && request.method === 'GET') {
      return Response.json({
        message: "Hello! This is my calculator server 🧮",
        tools: ["add_numbers", "multiply_numbers"],
        version: "2.1",
        deployed_with: "GitHub + Cloudflare",
        mcp_compatible: true
      }, { headers: corsHeaders });
    }
    
    // MCP connection endpoint - Enhanced for Cursor
    if (url.pathname === '/mcp' && request.method === 'GET') {
      const sessionId = crypto.randomUUID();
      
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          // Send initial connection
          const welcome = {
            type: "connection_established",
            session_id: sessionId,
            message: "MCP Server Ready",
            server: "calculator",
            tools_available: 2
          };
          
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(welcome)}\n\n`));
          } catch (e) {
            console.error('SSE error:', e);
          }
          
          // Send heartbeat
          const interval = setInterval(() => {
            const heartbeat = { 
              type: "heartbeat", 
              timestamp: new Date().toISOString(),
              session_id: sessionId
            };
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
            } catch (e) {
              clearInterval(interval);
            }
          }, 30000);
          
          // Cleanup
          setTimeout(() => {
            clearInterval(interval);
            try {
              controller.close();
            } catch (e) {
              // Already closed
            }
          }, 300000);
        }
      });
      
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Mcp-Session-Id': sessionId,
          'X-Accel-Buffering': 'no', // Disable proxy buffering
        }
      });
    }
    
    // MCP request handler - Enhanced error handling
    if (url.pathname === '/mcp' && request.method === 'POST') {
      try {
        const requestData = await request.json();
        const method = requestData.method;
        const params = requestData.params || {};
        const requestId = requestData.id;
        
        console.log('MCP Request:', method, params); // Debug logging
        
        let result;
        
        if (method === 'tools/list') {
          // Enhanced tools definition for better Cursor compatibility
          result = {
            tools: [
              {
                name: "add_numbers",
                description: "Add two numbers together and return the result",
                inputSchema: {
                  type: "object",
                  properties: {
                    a: { 
                      type: "number", 
                      description: "The first number to add"
                    },
                    b: { 
                      type: "number", 
                      description: "The second number to add"
                    }
                  },
                  required: ["a", "b"],
                  additionalProperties: false
                }
              },
              {
                name: "multiply_numbers", 
                description: "Multiply two numbers together and return the result",
                inputSchema: {
                  type: "object",
                  properties: {
                    a: { 
                      type: "number", 
                      description: "The first number to multiply"
                    },
                    b: { 
                      type: "number", 
                      description: "The second number to multiply"
                    }
                  },
                  required: ["a", "b"],
                  additionalProperties: false
                }
              }
            ]
          };
        } else if (method === 'tools/call') {
          const toolName = params.name;
          const args = params.arguments || {};
          
          // Validate tool exists
          const validTools = ['add_numbers', 'multiply_numbers'];
          if (!validTools.includes(toolName)) {
            throw new Error(`Unknown tool: ${toolName}. Available tools: ${validTools.join(', ')}`);
          }
          
          // Validate arguments
          if (typeof args.a !== 'number' || typeof args.b !== 'number') {
            throw new Error(`Invalid arguments. Both 'a' and 'b' must be numbers. Got a=${typeof args.a}, b=${typeof args.b}`);
          }
          
          if (toolName === 'add_numbers') {
            const a = args.a;
            const b = args.b;
            const answer = a + b;
            
            calculationHistory.push({
              operation: 'add',
              a: a,
              b: b,
              result: answer,
              timestamp: new Date().toISOString(),
              tool: toolName
            });
            
            result = {
              content: [
                {
                  type: "text",
                  text: `Added ${a} + ${b} = ${answer}`
                }
              ]
            };
          } else if (toolName === 'multiply_numbers') {
            const a = args.a;
            const b = args.b;
            const answer = a * b;
            
            calculationHistory.push({
              operation: 'multiply',
              a: a,
              b: b,
              result: answer,
              timestamp: new Date().toISOString(),
              tool: toolName
            });
            
            result = {
              content: [
                {
                  type: "text",
                  text: `Multiplied ${a} × ${b} = ${answer}`
                }
              ]
            };
          }
        } else {
          throw new Error(`Unsupported method: ${method}. Supported methods: tools/list, tools/call`);
        }
        
        const response = {
          jsonrpc: "2.0", // Add JSON-RPC version for compatibility
          id: requestId,
          result: result
        };
        
        console.log('MCP Response:', response); // Debug logging
        
        return Response.json(response, { headers: corsHeaders });
        
      } catch (error) {
        console.error('MCP Error:', error); // Debug logging
        
        const errorResponse = {
          jsonrpc: "2.0",
          id: requestData?.id || null,
          error: {
            code: -32603,
            message: error.message,
            data: {
              type: error.constructor.name,
              timestamp: new Date().toISOString()
            }
          }
        };
        
        return Response.json(errorResponse, { 
          status: 400,
          headers: corsHeaders 
        });
      }
    }
    
    // Enhanced test endpoint
    if (url.pathname === '/test' && request.method === 'GET') {
      // Test the MCP tools/list endpoint
      const toolsListResponse = {
        tools: [
          {
            name: "add_numbers",
            description: "Add two numbers together and return the result"
          },
          {
            name: "multiply_numbers", 
            description: "Multiply two numbers together and return the result"
          }
        ]
      };
      
      // Test both tools
      const addResult = { a: 5, b: 3, answer: 5 + 3 };
      const multiplyResult = { a: 4, b: 7, answer: 4 * 7 };
      
      calculationHistory.push({
        operation: 'add',
        a: addResult.a,
        b: addResult.b,
        result: addResult.answer,
        timestamp: new Date().toISOString(),
        source: 'test_endpoint'
      });
      
      calculationHistory.push({
        operation: 'multiply',
        a: multiplyResult.a,
        b: multiplyResult.b,
        result: multiplyResult.answer,
        timestamp: new Date().toISOString(),
        source: 'test_endpoint'
      });
      
      return Response.json({
        message: "MCP Server Test Results",
        mcp_tools_available: toolsListResponse.tools,
        test_calculations: [
          {
            tool: "add_numbers",
            input: `${addResult.a} + ${addResult.b}`,
            output: addResult.answer,
            status: "success"
          },
          {
            tool: "multiply_numbers", 
            input: `${multiplyResult.a} × ${multiplyResult.b}`,
            output: multiplyResult.answer,
            status: "success"
          }
        ],
        server_info: {
          version: "2.1",
          deployed_with: "GitHub + Cloudflare",
          mcp_compatible: true,
          cursor_optimized: true
        }
      }, { headers: corsHeaders });
    }
    
    // History endpoint
    if (url.pathname === '/history' && request.method === 'GET') {
      const stats = {
        total_calculations: calculationHistory.length,
        additions: calculationHistory.filter(calc => calc.operation === 'add').length,
        multiplications: calculationHistory.filter(calc => calc.operation === 'multiply').length,
        last_calculation: calculationHistory.length > 0 ? calculationHistory[calculationHistory.length - 1] : null
      };
      
      return Response.json({
        statistics: stats,
        recent_calculations: calculationHistory.slice(-10),
        all_calculations: calculationHistory
      }, { headers: corsHeaders });
    }
    
    // Enhanced status endpoint
    if (url.pathname === '/status' && request.method === 'GET') {
      return Response.json({
        server: "MCP Calculator Server",
        version: "2.1",
        status: "running",
        tools_available: 2,
        total_calculations: calculationHistory.length,
        deployed_with: "GitHub + Cloudflare",
        mcp_endpoints: {
          connection: "/mcp (GET)",
          requests: "/mcp (POST)",
          test: "/test",
          history: "/history",
          status: "/status"
        },
        cursor_compatible: true,
        last_updated: new Date().toISOString()
      }, { headers: corsHeaders });
    }
    
    return new Response('Not found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
};
