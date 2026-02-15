import paramiko
import sys
import os

hostname = "43.156.132.218"
username = "ubuntu"
password = "x-%#Knso%et%es^c"
port = 22

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {username}@{hostname}...")
        client.connect(hostname, port=port, username=username, password=password)
        print("Connected!")

        # 1. Discover Directory
        print("Checking directories...")
        stdin, stdout, stderr = client.exec_command("ls -F ~")
        dirs = stdout.read().decode().strip().split('\n')
        print(f"Directories found: {dirs}")
        
        project_dir = "velora-jobs"
        if "velora-jobs/" in dirs:
            project_dir = "~/velora-jobs"
        elif "Velora-Jobs-FE-BE/" in dirs:
            project_dir = "~/Velora-Jobs-FE-BE"
        else:
            # Try to find it generically or clone it
            print("Project directory not found in root. Checking active docker containers...")
            stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}'")
            containers = stdout.read().decode().strip().split('\n')
            print(f"Active containers: {containers}")
            
            print(f"⚠️ Could not find project directory. Attempting to clone to ~/velora-jobs...")
            client.exec_command("git clone https://github.com/velora-1d/Velora-Jobs-FE-BE.git ~/velora-jobs")
            project_dir = "~/velora-jobs"

        print(f"Using project directory: {project_dir}")

        # 2. Deploy
        commands = [
            f"cd {project_dir} && git reset --hard && git pull",
            f"cd {project_dir} && docker compose down",
            f"cd {project_dir} && docker compose up -d --build",
            f"cd {project_dir} && docker compose exec -T backend alembic upgrade head" 
        ]

        for cmd in commands:
            print(f"\nExecuting: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            # Wait for command to finish
            exit_status = stdout.channel.recv_exit_status()
            
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            
            if out: print(f"[OUT] {out}")
            if err: print(f"[ERR] {err}")
            
            if exit_status != 0:
                print(f"Command failed with status {exit_status}")
                # Don't exit immediately, try to continue or debug
                # sys.exit(1)

        print("\nDeployment sequence finished.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    deploy()
