output "instance_ids" {
  description = "IDs of the EC2 instances"
  value       = { for k, v in aws_instance.dev_instance : k => v.id }
}

output "instance_public_ips" {
  description = "Public IP addresses of the EC2 instances"
  value       = { for k, v in aws_instance.dev_instance : k => v.public_ip }
}

output "instance_private_ips" {
  description = "Private IP addresses of the EC2 instances"
  value       = { for k, v in aws_instance.dev_instance : k => v.private_ip }
}
