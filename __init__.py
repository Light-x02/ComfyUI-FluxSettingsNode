from .FluxSettingsNode import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

# Merge both mappings into a single dictionary for the custom nodes
NODE_CLASS_MAPPINGS = {**NODE_CLASS_MAPPINGS}
WEB_DIRECTORY = "./web"

NODE_DISPLAY_NAME_MAPPINGS = {
    "FluxSettingsNode": "Flux Settings Node",
    "DisableNoise": "Disable Noise",
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
