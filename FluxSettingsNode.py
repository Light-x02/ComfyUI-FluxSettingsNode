import comfy.samplers
import comfy.sample
from comfy.k_diffusion import sampling as k_diffusion_sampling
import latent_preview
import torch
import comfy.utils
import node_helpers
from comfy.comfy_types import IO, ComfyNodeABC, InputTypeDict

class Noise_EmptyNoise:
    def __init__(self):
        self.seed = 0

    def generate_noise(self, input_latent):
        latent_image = input_latent["samples"]
        return torch.zeros(latent_image.shape, dtype=latent_image.dtype, layout=latent_image.layout, device="cpu")

class Noise_RandomNoise:
    def __init__(self, seed):
        self.seed = seed

    def generate_noise(self, input_latent):
        latent_image = input_latent["samples"]
        batch_inds = input_latent["batch_index"] if "batch_index" in input_latent else None
        return comfy.sample.prepare_noise(latent_image, self.seed, batch_inds)

class DisableNoise:
    @classmethod
    def INPUT_TYPES(s):
        return {"required": {}}

    RETURN_TYPES = ("NOISE",)
    FUNCTION = "get_noise"
    CATEGORY = "sampling/custom_sampling/noise"

    def get_noise(self):
        return (Noise_EmptyNoise(),)

class FluxSettingsNode(ComfyNodeABC, DisableNoise):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model": ("MODEL",),
                "conditioning": ("CONDITIONING",),
                "guidance": ("FLOAT", {"default": 3.5, "min": 0.0, "max": 100.0, "step": 0.1}),
                "sampler_name": (comfy.samplers.SAMPLER_NAMES, ),
                "scheduler": (comfy.samplers.SCHEDULER_NAMES, ),
                "steps": ("INT", {"default": 20, "min": 1, "max": 10000}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "noise_seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
            }
        }

    RETURN_TYPES = ("CONDITIONING", "SAMPLER", "SIGMAS", "NOISE")

    CATEGORY = "sampling/custom_sampling"

    FUNCTION = "execute"

    def apply_guidance(self, conditioning, guidance):
        c = node_helpers.conditioning_set_values(conditioning, {"guidance": guidance})
        return (c, )

    def get_sampler(self, sampler_name):
        sampler = comfy.samplers.sampler_object(sampler_name)
        return (sampler, )

    def get_sigmas(self, model, scheduler, steps, denoise):
        total_steps = steps
        if denoise < 1.0:
            if denoise <= 0.0:
                return (torch.FloatTensor([]),)
            total_steps = int(steps / denoise)

        sigmas = comfy.samplers.calculate_sigmas(
            model.get_model_object("model_sampling"),
            scheduler,
            total_steps
        ).cpu()

        sigmas = sigmas[-(steps + 1):]
        return (sigmas, )

    def get_noise(self, noise_seed):
        return (Noise_RandomNoise(noise_seed),)

    def execute(self, model, conditioning, guidance, sampler_name, scheduler, steps, denoise, noise_seed):
        c, = self.apply_guidance(conditioning, guidance)
        sampler, = self.get_sampler(sampler_name)
        sigmas, = self.get_sigmas(model, scheduler, steps, denoise)
        noise, = self.get_noise(noise_seed)
        return (c, sampler, sigmas, noise)

NODE_CLASS_MAPPINGS = {
    "FluxSettingsNode": FluxSettingsNode,
    "DisableNoise": DisableNoise,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "FluxSettingsNode": "Flux Settings Node",
    "DisableNoise": "Disable Noise",
}