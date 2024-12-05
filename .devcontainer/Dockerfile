# Use Debian Bookworm as the base image
FROM debian:bookworm

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install basic packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    # Add any other packages you need here
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

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

# Set the working directory
WORKDIR /workspaces/amber-eliza

# Add any additional setup or configuration here
