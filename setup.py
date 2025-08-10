#!/usr/bin/env python3
"""
SmartFaceTrack Setup Script
Automates the setup process for the attendance monitoring system.
"""

import os
import sys
import subprocess
import platform

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def check_node_version():
    """Check if Node.js version is compatible."""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"✅ Node.js {version} detected")
        return True
    except FileNotFoundError:
        print("❌ Node.js not found. Please install Node.js 16+")
        return False

def create_virtual_environment():
    """Create Python virtual environment."""
    if os.path.exists('venv'):
        print("ℹ️  Virtual environment already exists")
        return True
    
    return run_command('python -m venv venv', 'Creating virtual environment')

def activate_virtual_environment():
    """Activate virtual environment."""
    if platform.system() == 'Windows':
        activate_script = os.path.join('venv', 'Scripts', 'activate')
    else:
        activate_script = os.path.join('venv', 'bin', 'activate')
    
    if not os.path.exists(activate_script):
        print("❌ Virtual environment activation script not found")
        return False
    
    print("ℹ️  Please activate the virtual environment manually:")
    if platform.system() == 'Windows':
        print("   venv\\Scripts\\activate")
    else:
        print("   source venv/bin/activate")
    return True

def install_python_dependencies():
    """Install Python dependencies."""
    if platform.system() == 'Windows':
        pip_cmd = os.path.join('venv', 'Scripts', 'pip')
    else:
        pip_cmd = os.path.join('venv', 'bin', 'pip')
    
    return run_command(f'{pip_cmd} install -r requirements.txt', 'Installing Python dependencies')

def install_node_dependencies():
    """Install Node.js dependencies."""
    return run_command('npm install', 'Installing Node.js dependencies')

def create_env_file():
    """Create environment file template."""
    env_path = os.path.join('src', 'backend', '.env')
    if os.path.exists(env_path):
        print("ℹ️  .env file already exists")
        return True
    
    env_content = """# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/smartfacetrack

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Face Recognition
FACE_RECOGNITION_MODEL=Facenet
FACE_RECOGNITION_DISTANCE=0.6
"""
    
    try:
        os.makedirs(os.path.dirname(env_path), exist_ok=True)
        with open(env_path, 'w') as f:
            f.write(env_content)
        print("✅ Environment file template created")
        print("ℹ️  Please edit src/backend/.env with your actual configuration")
        return True
    except Exception as e:
        print(f"❌ Failed to create environment file: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 SmartFaceTrack Setup Script")
    print("=" * 50)
    
    # Check prerequisites
    if not check_python_version():
        return False
    
    if not check_node_version():
        return False
    
    # Create virtual environment
    if not create_virtual_environment():
        return False
    
    # Install dependencies
    if not install_python_dependencies():
        return False
    
    if not install_node_dependencies():
        return False
    
    # Create environment file
    if not create_env_file():
        return False
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Activate virtual environment:")
    if platform.system() == 'Windows':
        print("   venv\\Scripts\\activate")
    else:
        print("   source venv/bin/activate")
    print("2. Edit src/backend/.env with your database credentials")
    print("3. Create PostgreSQL database: createdb smartfacetrack")
    print("4. Run migrations: npm run db:migrate")
    print("5. Start the application:")
    print("   Terminal 1: npm run backend")
    print("   Terminal 2: npm run dev")
    print("\n📚 For detailed instructions, see SETUP.md")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
