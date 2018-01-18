package main

import (
	"fmt"

	"github.com/google/gopacket"
	"github.com/google/gopacket/pcap"
)

func main() {
	handle, err := pcap.OpenLive("XHC20", 2000000, true, pcap.BlockForever)
	if err != nil {
		panic(err)
	}
	// err = handle.SetBPFFilter("usb.response_in")
	// if err != nil {
	// 	panic(err)
	// }

	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
	for packet := range packetSource.Packets() {
		handlePacket(packet)
	}
}

func handlePacket(packet gopacket.Packet) {
	fmt.Println(packet.Data())
}
