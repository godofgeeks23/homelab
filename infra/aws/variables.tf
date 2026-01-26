variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "instances" {
  description = "List of instance configurations"
  type = list(object({
    name          = string
    instance_type = optional(string, "t3.micro")
    ssh_key_pair  = optional(string, "cyethack-aws-key")
    disk_size     = optional(number, 32)
    ports         = optional(list(number), [22, 80, 81, 443])
  }))
}
