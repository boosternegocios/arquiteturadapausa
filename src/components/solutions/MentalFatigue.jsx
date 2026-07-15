import React from 'react'

export const MentalFatigue = ({ data, onChange }) => {
  const updateData = (section, field, value) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    })
  }

  // 01: Dias da Semana
  const renderAct01 = () => {
    const days = [
      { key: 'seg', label: 'Segunda-feira' },
      { key: 'ter', label: 'Terça-feira' },
      { key: 'qua', label: 'Quarta-feira' },
      { key: 'qui', label: 'Quinta-feira' },
      { key: 'sex', label: 'Sexta-feira' },
      { key: 'sab', label: 'Sábado' },
      { key: 'dom', label: 'Domingo' }
    ]
    const weekData = data?.act01 || {}

    return (
      <div className="mb-10 md:mb-16 bg-white p-5 md:p-10 rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in">
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">01. Dimensione o Tempo de Drenagem</h3>
        <p className="text-slate-500 font-medium mb-8">Descreva como vai organizar o tempo das tarefas que você não curte mas precisa fazer, alternando com energizantes ao longo da semana.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {days.map(d => (
            <div key={d.key} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-[#1ed7a4] mb-3 inline-block">{d.label}</span>
              <textarea 
                placeholder="Plano para este dia..."
                value={weekData[d.key] || ''}
                onChange={(e) => updateData('act01', d.key, e.target.value)}
                className="w-full flex-1 min-h-[100px] bg-white p-4 rounded-xl border border-transparent outline-none focus:border-[#1ed7a4] transition-colors text-sm text-slate-700 resize-none font-medium placeholder:font-normal" 
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 02: O que está na mente / Paz na Krise
  const renderAct02 = () => {
    return (
      <div className="mb-10 md:mb-16 bg-gradient-to-br from-[#1ed7a4] to-[#004b4c] p-5 md:p-10 rounded-3xl md:rounded-[3rem] shadow-xl text-white animate-in fade-in relative overflow-hidden" style={{animationDelay: '100ms'}}>
        <div className="absolute top-0 right-0 w-full h-full bg-white opacity-5 mix-blend-overlay"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-2 font-display">02. Experienciando Paz no Caos</h3>
          <p className="text-[#fcfaf5]/80 font-medium mb-6">Você já experimentou paz em meio a uma crise? Como você conseguiu manter seu estado de espírito tranquilo? Descreva a situação.</p>
          
          <textarea 
            placeholder="Relate sua experiência e a ferramenta mental que utilizou..."
            value={data?.act02?.paz || ''}
            onChange={(e) => updateData('act02', 'paz', e.target.value)}
            className="w-full min-h-[160px] bg-black/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 outline-none focus:border-white/50 focus:bg-white/10 transition-all text-sm md:text-base text-white placeholder:text-white/40 resize-none" 
          />
        </div>
      </div>
    )
  }

  // 03: Despejo Mental (Images, Frases etc)
  const renderAct03 = () => {
    const items = [
      { key: 'imagens', label: 'Imagens Recorrentes' },
      { key: 'frases', label: 'Frases que Escuta' },
      { key: 'pessoas', label: 'Pessoas' },
      { key: 'lugares', label: 'Lugares' },
      { key: 'eventos', label: 'Eventos ou Compromissos' },
      { key: 'emocoes', label: 'Emoções Predominantes' },
      { key: 'medos', label: 'Medos' },
      { key: 'duvidas', label: 'Dúvidas' }
    ]

    return (
      <div className="mb-10 md:mb-16 bg-white p-5 md:p-10 rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in" style={{animationDelay: '200ms'}}>
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">01. O que realmente está na sua mente?</h3>
        <p className="text-slate-500 font-medium mb-8">Faça um despejo mental categorizando o barulho interno nos quadrantes abaixo:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {items.map(item => (
            <div key={item.key} className="flex flex-col">
              <label className="text-xs font-black uppercase text-[#eb6496] tracking-wider mb-2 pl-2 border-l-2 border-[#eb6496]">
                {item.label}
              </label>
              <textarea 
                placeholder={`Mapeie os(as) ${item.label.toLowerCase()}...`}
                value={data?.act03?.[item.key] || ''}
                onChange={(e) => updateData('act03', item.key, e.target.value)}
                className="w-full bg-[#fcfaf5] p-4 rounded-xl border border-slate-100 outline-none focus:border-[#eb6496] focus:bg-white transition-colors text-sm font-medium text-slate-700 min-h-[90px]" 
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 04: Inventario de Pensamentos
  const renderAct04 = () => {
    const defaultList = [{ negative: '', positive: '' }, { negative: '', positive: '' }, { negative: '', positive: '' }, { negative: '', positive: '' }]
    const inventario = data?.act04?.list || defaultList

    return (
      <div className="mb-10 md:mb-16 bg-[#fcfaf5] border-2 border-dashed border-[#1ed7a4]/30 p-5 md:p-10 rounded-3xl md:rounded-[3rem] shadow-sm animate-in fade-in" style={{animationDelay: '300ms'}}>
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">02. Inventário e Ressignificação</h3>
        <p className="text-slate-500 font-medium mb-8">Para cada pensamento negativo (do despejo acima), reformule-o em um pensamento afirmativo positivo utilizando suas referências éticas, crenças ou citações.</p>
        
        <div className="space-y-6">
          <div className="hidden md:flex font-black uppercase text-xs tracking-widest text-slate-400">
            <div className="flex-1 px-4 text-center">Pensamento Negativo</div>
            <div className="flex-1 px-4 text-center text-[#1ed7a4]">Afirmação Positiva</div>
          </div>
          
          {inventario.map((inv, index) => (
            <div key={`inv-${index}`} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-[#eb6496] mb-1 block">Negativo</span>
                <input 
                  type="text" 
                  value={inv.negative}
                  placeholder="Seu pensamento castrador..."
                  onChange={(e) => {
                    const n = [...inventario]; n[index].negative = e.target.value; updateData('act04', 'list', n)
                  }}
                  className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm outline-none focus:border-[#eb6496] transition-colors text-sm font-medium text-slate-700" 
                />
              </div>
              <div className="hidden md:flex items-center justify-center shrink-0 w-8 text-slate-300 font-black">→</div>
              <div className="flex-1 mt-2 md:mt-0">
                <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-[#1ed7a4] mb-1 block">Positivo</span>
                <input 
                  type="text" 
                  value={inv.positive}
                  placeholder="Transformado em ação/citação..."
                  onChange={(e) => {
                    const n = [...inventario]; n[index].positive = e.target.value; updateData('act04', 'list', n)
                  }}
                  className="w-full bg-white p-4 rounded-xl border-2 border-[#1ed7a4]/20 shadow-sm outline-none focus:border-[#1ed7a4] transition-colors text-sm font-medium text-slate-800" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <div className="mb-8 md:mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-[#1ed7a4] uppercase tracking-tighter mb-4 font-display">RECUPERAÇÃO MENTAL</h2>
        <p className="text-lg text-slate-500 font-medium">
          Se você obteve alto índice de cansaço mental, essa auto reflexão pode ajudá-lo a melhorar esse aspecto.<br /><br />
          Que imagens, frases, pessoas, lugares, eventos, emoções, medos e dúvidas estão flutuando no seu espaço mental?<br />
          Escreva abaixo tudo o que você encontrar ocupando seus pensamentos. Resista à vontade de analisar ou julgar cada pensamento, apenas reconheça sua presença.
        </p>
      </div>

      {/* Ocultado temporariamente a pedido: renderAct01() */}
      {/* Ocultado temporariamente a pedido: renderAct02() */}
      {renderAct03()}
      {renderAct04()}
    </div>
  )
}
