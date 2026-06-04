/**
 * matrix.js
 * Optimized 60FPS 3D Matrix Background using Three.js
 */

document.addEventListener('DOMContentLoaded', () => {
    let scene, camera, renderer;
    let matrixRain = new THREE.Group();
    let particles;
    let animationId;
    let mouseX = 0;
    let mouseY = 0;

    const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*'.split('');

    function initThreeJS() {
        const canvas = document.getElementById('matrix-canvas');
        if (!canvas) return;

        scene = new THREE.Scene();
        // Fog to blend into background
        scene.fog = new THREE.FogExp2(0x040406, 0.015);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 50;

        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance

        // 1. Matrix Rain (3D Sprites)
        scene.add(matrixRain);
        
        for (let i = 0; i < 150; i++) {
            const spriteMaterial = new THREE.SpriteMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            
            // Random positions in a volume
            sprite.position.x = (Math.random() - 0.5) * 120;
            sprite.position.y = (Math.random() - 0.5) * 120;
            sprite.position.z = (Math.random() - 0.5) * 60;
            
            // User Data for animation
            sprite.userData = {
                fallSpeed: 0.1 + Math.random() * 0.3,
                driftSpeed: 0.01 + Math.random() * 0.02,
                rotationSpeed: (Math.random() - 0.5) * 0.01,
                pulseSpeed: 1 + Math.random() * 2,
                pulseOffset: Math.random() * Math.PI * 2
            };

            // Generate initial Canvas Texture
            updateSpriteTexture(sprite);
            matrixRain.add(sprite);
        }

        // 2. Ambient Data Particles
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 400;
        const posArray = new Float32Array(particleCount * 3);
        const velArray = new Float32Array(particleCount * 3);

        for(let i = 0; i < particleCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 150;
            velArray[i] = (Math.random() - 0.5) * 0.02;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velArray, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.4,
            color: 0x00F060,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });

        particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);

        // Mouse Events
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();
    }

    function updateSpriteTexture(sprite) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;

        context.fillStyle = `rgba(0, 240, 96, ${0.6 + Math.random() * 0.4})`;
        context.font = 'bold 36px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        context.fillText(char, 32, 32);

        if (sprite.material.map) sprite.material.map.dispose();
        sprite.material.map = new THREE.CanvasTexture(canvas);
        sprite.material.needsUpdate = true;
    }

    function animate(time) {
        animationId = requestAnimationFrame(animate);
        time *= 0.001; // convert to seconds

        // Animate Rain
        matrixRain.children.forEach((sprite, index) => {
            const userData = sprite.userData;

            sprite.position.y -= userData.fallSpeed;
            sprite.position.x += Math.sin(time * userData.driftSpeed + index) * 0.05;

            // Reset when falling below view
            if (sprite.position.y < -60) {
                sprite.position.y = 60;
                sprite.position.x = (Math.random() - 0.5) * 120;
                sprite.position.z = (Math.random() - 0.5) * 60;

                // Randomly change character
                if (Math.random() < 0.3) {
                    updateSpriteTexture(sprite);
                }
            }

            sprite.rotation.z += userData.rotationSpeed;

            // Pulsing opacity
            const pulse = Math.sin(time * userData.pulseSpeed + userData.pulseOffset);
            sprite.material.opacity = 0.4 + pulse * 0.2;
            
            // Pulsing scale
            const scalePulse = Math.cos(time * userData.pulseSpeed * 0.7 + userData.pulseOffset);
            sprite.scale.setScalar(2.0 + scalePulse * 0.3);
        });

        // Animate Particles
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.attributes.velocity.array;

        for (let i = 0; i < positions.length; i += 3) {
            const gravity = 0.00001;
            const turbulence = 0.00005;

            velocities[i] += -positions[i] * gravity + (Math.random() - 0.5) * turbulence;
            velocities[i + 1] += -positions[i + 1] * gravity + (Math.random() - 0.5) * turbulence;
            velocities[i + 2] += -positions[i + 2] * gravity + (Math.random() - 0.5) * turbulence;

            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];

            if (Math.abs(positions[i]) > 75) velocities[i] *= -0.1;
            if (Math.abs(positions[i + 1]) > 75) velocities[i + 1] *= -0.1;
            if (Math.abs(positions[i + 2]) > 75) velocities[i + 2] *= -0.1;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.0002;

        // Camera Mouse Interaction (Smooth Dampening)
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
        camera.position.y += (mouseY * 5 - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    // Start
    initThreeJS();
});
