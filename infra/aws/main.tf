provider "aws" {
  region = var.region
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}


locals {
  instances_map = { for inst in var.instances : inst.name => inst }
}

resource "aws_security_group" "allow_ports" {
  for_each = local.instances_map

  name        = "${each.value.name}-sg"
  description = "Allow inbound traffic for ${each.value.name}"

  dynamic "ingress" {
    for_each = each.value.ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${each.value.name}-sg"
  }
}

resource "aws_instance" "dev_instance" {
  for_each = local.instances_map

  ami           = data.aws_ami.ubuntu.id
  instance_type = each.value.instance_type
  key_name      = each.value.ssh_key_pair

  vpc_security_group_ids = [aws_security_group.allow_ports[each.key].id]

  root_block_device {
    volume_size = each.value.disk_size
  }

  user_data = file("${path.module}/../../scripts/init.sh")

  tags = {
    Name = each.value.name
  }
}
