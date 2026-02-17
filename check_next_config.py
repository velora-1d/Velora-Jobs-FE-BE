import paramiko

HOST = "43.156.132.218"
USER = "ubuntu"
PASS = "x-%#Knso%et%es^c"

def check_next_config():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {USER}@{HOST}...")
        client.connect(HOST, username=USER, password=PASS)
        
        print("\n--- Next.js Config ---")
        cmd = "cat /home/ubuntu/Velora-Jobs-FE-BE/frontend/next.config.js"
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        
        print("\n--- Try foreground build (100 lines) ---")
        # Just running the build command in the container to see immediate error
        # We need a temporary container for this
        cmd = "cd ~/Velora-Jobs-FE-BE && docker compose run --rm builder npm run build"
        # Wait, there is no 'builder' service. We should use 'frontend'
        cmd = "cd ~/Velora-Jobs-FE-BE && docker compose build frontend"
        stdin, stdout, stderr = client.exec_command(cmd)
        
        # We will read progress to find the error
        import time
        start_time = time.time()
        while time.time() - start_time < 300: # 5 min limit
            if stdout.channel.recv_ready():
                print(stdout.readline().strip())
            if stderr.channel.recv_stderr_ready():
                print(stderr.readline().strip())
            if stdout.channel.exit_status_ready():
                break
            time.sleep(1)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    check_next_config()
