# Use Debian Bookworm as the base image
FROM debian:bookworm

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install basic packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    tmux \
    sudo \
    # Add any other packages you need here
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install and configure mise
RUN curl https://mise.run | sh

# Add mise to PATH and configure shell
RUN echo 'export PATH="/root/.local/bin:$PATH"' >> ~/.bashrc
RUN echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc

# Now we can use mise
RUN /root/.local/bin/mise install

# Create a non-root user to match the host user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=1000

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Switch to the non-root user
USER $USERNAME

# Set up tmux configuration
RUN echo "set-option -g default-shell /bin/bash" > /home/vscode/.tmux.conf && \
    echo "set -g mouse on" >> /home/vscode/.tmux.conf && \
    chown vscode:vscode /home/vscode/.tmux.conf

# Set the working directory
WORKDIR /workspaces/amber-eliza

# Define the default command
CMD ["bash"]
