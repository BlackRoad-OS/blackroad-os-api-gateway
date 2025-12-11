/**
 * Pyto Python IDE Integration
 * Integration with Pyto iOS/iPadOS Python IDE
 * https://pyto.app/
 */

import type { IntegrationConfig } from '../manager';

export interface PytoScript {
  name: string;
  path: string;
  content: string;
  description?: string;
  dependencies?: string[];
  runOnStartup?: boolean;
}

export interface PytoCallback {
  action: 'run' | 'open' | 'import';
  script?: string;
  code?: string;
  args?: string[];
  x_success?: string;
  x_error?: string;
}

export interface PytoConfig extends IntegrationConfig {
  scriptsPath?: string;
  defaultArgs?: string[];
}

/**
 * Pyto integration for running Python scripts on iOS/iPadOS
 * Generates x-callback-url schemes and Python automation scripts
 */
export class PytoIntegration {
  private config: PytoConfig;
  private scripts: Map<string, PytoScript> = new Map();

  constructor(config: PytoConfig) {
    this.config = config;
    this.initializeDefaultScripts();
  }

  private initializeDefaultScripts(): void {
    const defaultScripts: PytoScript[] = [
      {
        name: 'health_check',
        path: 'blackroad/health_check.py',
        description: 'Check health of all BlackRoad OS services',
        dependencies: ['requests', 'rich'],
        content: `#!/usr/bin/env python3
"""BlackRoad OS Health Check Script"""

import requests
from datetime import datetime

SERVICES = {
    "API Gateway": "https://codex.blackroad.io/health",
    "Beacon": "https://beacon.blackroad.io/health",
    "Core": "https://core.blackroad.io/health",
    "Prism": "https://prism.blackroad.io/health",
}

def check_health():
    """Check health of all services"""
    print(f"\\n🏥 BlackRoad OS Health Check - {datetime.now().isoformat()}")
    print("=" * 50)

    results = []
    for name, url in SERVICES.items():
        try:
            response = requests.get(url, timeout=10)
            status = "✅" if response.status_code == 200 else "⚠️"
            data = response.json() if response.ok else {}
            results.append({
                "name": name,
                "status": status,
                "code": response.status_code,
                "uptime": data.get("uptime", "N/A"),
            })
        except Exception as e:
            results.append({
                "name": name,
                "status": "❌",
                "code": 0,
                "error": str(e),
            })

    for r in results:
        if "error" in r:
            print(f"{r['status']} {r['name']}: Error - {r['error']}")
        else:
            print(f"{r['status']} {r['name']}: {r['code']} (uptime: {r['uptime']})")

    return results

if __name__ == "__main__":
    check_health()
`,
      },
      {
        name: 'deploy_trigger',
        path: 'blackroad/deploy_trigger.py',
        description: 'Trigger deployment to various platforms',
        dependencies: ['requests'],
        content: `#!/usr/bin/env python3
"""BlackRoad OS Deployment Trigger"""

import requests
import os
import sys

PLATFORMS = {
    "railway": {
        "webhook": os.environ.get("RAILWAY_WEBHOOK_URL"),
        "method": "POST",
    },
    "vercel": {
        "webhook": os.environ.get("VERCEL_WEBHOOK_URL"),
        "method": "POST",
    },
    "cloudflare": {
        "webhook": os.environ.get("CLOUDFLARE_WEBHOOK_URL"),
        "method": "POST",
    },
}

def trigger_deploy(platform: str, service: str = "api-gateway"):
    """Trigger deployment for a platform"""
    if platform not in PLATFORMS:
        print(f"❌ Unknown platform: {platform}")
        print(f"Available: {', '.join(PLATFORMS.keys())}")
        return False

    config = PLATFORMS[platform]
    if not config["webhook"]:
        print(f"❌ {platform.upper()}_WEBHOOK_URL not set")
        return False

    print(f"🚀 Triggering {platform} deployment for {service}...")

    try:
        response = requests.request(
            config["method"],
            config["webhook"],
            json={"service": service, "action": "deploy"},
            timeout=30,
        )

        if response.ok:
            print(f"✅ Deployment triggered successfully")
            return True
        else:
            print(f"⚠️ Deployment trigger returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    platform = sys.argv[1] if len(sys.argv) > 1 else "railway"
    service = sys.argv[2] if len(sys.argv) > 2 else "api-gateway"
    trigger_deploy(platform, service)
`,
      },
      {
        name: 'pi_monitor',
        path: 'blackroad/pi_monitor.py',
        description: 'Monitor Raspberry Pi fleet status',
        dependencies: ['paramiko', 'rich'],
        content: `#!/usr/bin/env python3
"""BlackRoad OS Raspberry Pi Fleet Monitor"""

import socket
import concurrent.futures

PI_FLEET = [
    {"name": "Lucidia Pi", "host": "192.168.4.38", "port": 22},
    {"name": "BlackRoad Pi", "host": "192.168.4.64", "port": 22},
    {"name": "Mystery Pi", "host": "192.168.4.49", "port": 22},
]

def check_pi(pi: dict) -> dict:
    """Check if a Pi is reachable"""
    result = {"name": pi["name"], "host": pi["host"]}

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result["reachable"] = sock.connect_ex((pi["host"], pi["port"])) == 0
        sock.close()
    except Exception as e:
        result["reachable"] = False
        result["error"] = str(e)

    return result

def monitor_fleet():
    """Monitor all Pis in the fleet"""
    print("\\n🥧 BlackRoad OS Pi Fleet Monitor")
    print("=" * 40)

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(check_pi, PI_FLEET))

    for r in results:
        status = "✅ Online" if r.get("reachable") else "❌ Offline"
        print(f"{r['name']} ({r['host']}): {status}")

    return results

if __name__ == "__main__":
    monitor_fleet()
`,
      },
      {
        name: 'log_viewer',
        path: 'blackroad/log_viewer.py',
        description: 'View and filter service logs',
        dependencies: ['requests', 'rich'],
        content: `#!/usr/bin/env python3
"""BlackRoad OS Log Viewer"""

import requests
import sys
from datetime import datetime

LOG_ENDPOINTS = {
    "gateway": "https://codex.blackroad.io/api/logs",
    "beacon": "https://beacon.blackroad.io/stream",
}

def view_logs(service: str = "gateway", lines: int = 50):
    """View logs for a service"""
    print(f"\\n📋 BlackRoad OS Log Viewer - {service}")
    print(f"Last {lines} lines - {datetime.now().isoformat()}")
    print("=" * 50)

    endpoint = LOG_ENDPOINTS.get(service)
    if not endpoint:
        print(f"❌ Unknown service: {service}")
        print(f"Available: {', '.join(LOG_ENDPOINTS.keys())}")
        return

    try:
        response = requests.get(
            endpoint,
            params={"lines": lines},
            timeout=30,
            stream=service == "beacon",
        )

        if service == "beacon":
            # SSE stream
            for line in response.iter_lines():
                if line:
                    print(line.decode())
        else:
            # Regular JSON response
            logs = response.json()
            for log in logs:
                print(f"[{log.get('timestamp', 'N/A')}] {log.get('message', log)}")

    except Exception as e:
        print(f"❌ Error fetching logs: {e}")

if __name__ == "__main__":
    service = sys.argv[1] if len(sys.argv) > 1 else "gateway"
    lines = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    view_logs(service, lines)
`,
      },
      {
        name: 'ai_query',
        path: 'blackroad/ai_query.py',
        description: 'Query AI models via API',
        dependencies: ['requests', 'openai'],
        content: `#!/usr/bin/env python3
"""BlackRoad OS AI Query Tool"""

import os
import sys
import requests

def query_huggingface(prompt: str, model: str = "meta-llama/Llama-2-70b-chat-hf"):
    """Query Hugging Face Inference API"""
    api_key = os.environ.get("HUGGINGFACE_API_KEY")
    if not api_key:
        print("❌ HUGGINGFACE_API_KEY not set")
        return None

    print(f"🤖 Querying {model}...")

    response = requests.post(
        f"https://api-inference.huggingface.co/models/{model}",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"inputs": prompt, "parameters": {"max_new_tokens": 500}},
        timeout=60,
    )

    if response.ok:
        result = response.json()
        if isinstance(result, list) and len(result) > 0:
            return result[0].get("generated_text", result)
        return result
    else:
        print(f"❌ Error: {response.status_code}")
        return None

def query_local(prompt: str, endpoint: str = "http://localhost:11434"):
    """Query local Ollama model"""
    print(f"🤖 Querying local model...")

    response = requests.post(
        f"{endpoint}/api/generate",
        json={"model": "llama2", "prompt": prompt, "stream": False},
        timeout=120,
    )

    if response.ok:
        return response.json().get("response")
    return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ai_query.py <prompt> [model]")
        sys.exit(1)

    prompt = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else None

    # Try local first, then HuggingFace
    result = query_local(prompt)
    if not result:
        result = query_huggingface(prompt, model) if model else query_huggingface(prompt)

    if result:
        print("\\n" + "=" * 50)
        print(result)
`,
      },
    ];

    for (const script of defaultScripts) {
      this.scripts.set(script.name, script);
    }
  }

  /**
   * Generate x-callback-url for a Pyto action
   */
  generateCallbackUrl(callback: PytoCallback): string {
    const params = new URLSearchParams();

    if (callback.script) params.set('script', callback.script);
    if (callback.code) params.set('code', callback.code);
    if (callback.args) params.set('args', callback.args.join(' '));
    if (callback.x_success) params.set('x-success', callback.x_success);
    if (callback.x_error) params.set('x-error', callback.x_error);

    return `pyto://${callback.action}?${params.toString()}`;
  }

  /**
   * Generate URL to run a script
   */
  generateRunUrl(scriptName: string, args?: string[]): string {
    const script = this.scripts.get(scriptName);
    if (!script) {
      throw new Error(`Script ${scriptName} not found`);
    }

    return this.generateCallbackUrl({
      action: 'run',
      script: script.path,
      args,
    });
  }

  /**
   * Generate URL to run inline code
   */
  generateRunCodeUrl(code: string): string {
    return this.generateCallbackUrl({
      action: 'run',
      code,
    });
  }

  /**
   * Get all scripts
   */
  getScripts(): PytoScript[] {
    return Array.from(this.scripts.values());
  }

  /**
   * Add a script
   */
  addScript(script: PytoScript): void {
    this.scripts.set(script.name, script);
  }

  /**
   * Generate requirements.txt for all scripts
   */
  generateRequirements(): string {
    const deps = new Set<string>();
    for (const script of this.scripts.values()) {
      for (const dep of script.dependencies || []) {
        deps.add(dep);
      }
    }
    return Array.from(deps).sort().join('\n');
  }

  /**
   * Generate iOS Shortcuts compatible actions
   */
  generateShortcutsActions(): Array<{ name: string; url: string; description: string }> {
    return this.getScripts().map((script) => ({
      name: `Run ${script.name}`,
      url: this.generateRunUrl(script.name),
      description: script.description || `Run ${script.name} script`,
    }));
  }

  async healthCheck(): Promise<boolean> {
    return this.config.enabled && this.scripts.size > 0;
  }
}

export async function initPyto(config: PytoConfig): Promise<boolean> {
  const pyto = new PytoIntegration(config);
  return pyto.healthCheck();
}

export function pytoHealthCheck(config: PytoConfig): () => Promise<boolean> {
  const pyto = new PytoIntegration(config);
  return () => pyto.healthCheck();
}
